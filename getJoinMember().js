DBCopy()
android = Packages.android; //Fix android bug. (do not edit)

const mPath = "/sdcard/TMP.DB";
const mPath2 = "/sdcard/TMP2.DB";

var room = {};
var user = {};
var myIdCache = {};
var keyCache = {};
var data = [];

const DB = android.database.sqlite.SQLiteDatabase.openDatabase(mPath, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
const DB2 = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);

var cur = DB2.rawQuery("SELECT user_id FROM open_profile", null);
cur.moveToNext();
var myid = cur.getString(0);
for (var i = 20; i <= 27; i++) {
    myIdCache[String(i)] = decrypt(myid, i);
}

function toJavaByteArr(arr) {
    var B = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, arr.length);
    for (var i = 0; i < arr.length; i++) {
        B[i] = new java.lang.Integer(arr[i]).byteValue();
    }
    return B;
}

function arraycopy(srcArr, srcPos, destArr, destPos, length) {
    for (var i = 0; i < length; i++) {
        destArr[destPos + i] = srcArr[srcPos + i];
    }
}

function initArray(size, fill) {
    var arr = new Array(size);
    for (var i = 0; i < size; i++) {
        arr[i] = fill;
    }
    return arr;
}

function genSalt(userId, encType) {
    if (userId <= 0) {
        return '\0'.repeat(16);
    }
    var prefixes = ['', '', '12', '24', '18', '30', '36', '12', '48', '7', '35', '40', '17', '23', '29', 'isabel', 'kale', 'sulli', 'van', 'merry', 'kyle', 'james', 'maddux', 'tony', 'hayden', 'paul', 'elijah', 'dorothy', 'sally', 'bran'];
    var salt = (prefixes[encType] + userId).slice(0, 16);
    salt = salt + '\0'.repeat(16 - salt.length);
    return new java.lang.String(salt).getBytes("UTF-8").slice();
}

function adjust(a, aOff, b) {
    var x = (b[b.length - 1] & 0xff) + (a[aOff + b.length - 1] & 0xff) + 1;
    a[aOff + b.length - 1] = x % 256;
    x = x >> 8;
    for (var i = b.length - 2; i >= 0; i--) {
        x = x + (b[i] & 0xff) + (a[aOff + i] & 0xff);
        a[aOff + i] = x % 256;
        x = x >> 8;
    }
}

function deriveKey(userId, encType) {
    var salt = genSalt(userId, encType);
    var password = [0, 22, 0, 8, 0, 9, 0, 111, 0, 2, 0, 23, 0, 43, 0, 8, 0, 33, 0, 33, 0, 10, 0, 16, 0, 3, 0, 3, 0, 7, 0, 6, 0, 0];
    var iterations = 2;
    var dkeySize = 32;
    var v = 64; //hash block size
    var u = 20; //hash digest size

    var D = initArray(v, 1);
    var S = initArray(v * Math.floor((salt.length + v - 1) / v), 0);
    for (var i in S) {
        S[i] = salt[i % salt.length];
    }
    var P = initArray(v * Math.floor((password.length + v - 1) / v), 0);
    for (var i in P) {
        P[i] = password[i % password.length];
    }
    var I = S.concat(P);
    var B = initArray(v, 0);

    var c = Math.floor((dkeySize + u - 1) / u);
    var dKey = initArray(dkeySize, 0);

    for (var i = 1; i <= c; i++) {
        var hasher = java.security.MessageDigest.getInstance("SHA-1");
        hasher.update(toJavaByteArr(D));
        hasher.update(toJavaByteArr(I));
        var A = hasher.digest();

        for (var j = 1; j < iterations; j++) {
            hasher = java.security.MessageDigest.getInstance("SHA-1");
            hasher.update(A);
            A = hasher.digest();
        }

        for (var j = 0; j != B.length; j++) {
            B[j] = A[j % A.length];
        }

        for (var j = 0; j != I.length / v; j++) {
            adjust(I, j * v, B);
        }

        if (i == c) {
            arraycopy(A, 0, dKey, (i - 1) * u, dKey.length - ((i - 1) * u));
        } else {
            arraycopy(A, 0, dKey, (i - 1) * u, A.length);
        }
    }

    return dKey;
}

function b64AESDecrypt(key, iv, encrypted) {
    encrypted = android.util.Base64.decode(encrypted, 0);
    iv = new javax.crypto.spec.IvParameterSpec(iv);
    key = new javax.crypto.spec.SecretKeySpec(key, "AES");
    var cipher = new javax.crypto.Cipher.getInstance("AES/CBC/PKCS5PADDING");
    cipher.init(2, key, iv);
    return cipher.doFinal(encrypted);
}

function decrypt(key, b64CipherText) {
    try {
        var iv = [15, 8, 1, 0, 25, 71, 37, 220, 21, 245, 23, 224, 225, 21, 12, 53];
        var decrypted = b64AESDecrypt(toJavaByteArr(key), toJavaByteArr(iv), b64CipherText);
        return String(new java.lang.String(decrypted, "utf-8"));
    } catch (err) {
        return b64CipherText;
    }
}

function getJoinMember(){
    try {
        DBCopy();
        var cur = DB.rawQuery("select chat_id,user_id,message,v,attachment from chat_logs where v LIKE '%NEWMEM%' ORDER BY id DESC LIMIT 1", null);
        var c = getChatData(cur);

        var chatId = c[0].chat_id;
        setRoom(chatId);
        var roomName = room[chatId]; 
        var date = getChatInfo(chatId)["v"]["c"];
        var nickname = c[0].message.members[0].nickName;

        var items = []
        items.push({
            "name": nickname,
            "id": chatId,
            "date": date,
            "room": roomName
        })
        DB.close();
        return items[0];
    } catch (e) {
        return e.toString()
    }
}

function getChatData(cursor) {
    data = [];
    for (i = 0; i < cursor.getCount(); i++) {
        for (j = 0; cursor.moveToNext(); j++) {
               data.push({
                "chat_id": cursor.getString(0),
                "user_id": cursor.getString(1),
                "message": JSON.parse(Decrypt(cursor.getString(1), JSON.parse(cursor.getString(3)).enc, cursor.getString(2))),
                "v": JSON.parse(cursor.getString(3)),
                "attachment": cursor.getBlob(4)
            })
        }
    }
    return data;
}

function getU(cursor) {
    data = [];
    for (i = 0; i < cursor.getCount(); i++) {
        for (j = 0; cursor.moveToNext(); j++) {
            data.push({
                "name": cursor.getString(0),
                "v": JSON.parse(cursor.getString(1)),
                "enc": cursor.getString(2)
            })
        }
    }
    return data;
}

function getR(cursor) {
    while (cursor.moveToNext()) {
        try {
            return cursor.getString(0);
        } catch (e) {
            return "";
        }
    }
}

function Decrypt(id, enc, str) {
    return decrypt(deriveKey(id, enc), str);
}

function DBCopy() { //Thanks Delta.
    var src = new java.io.File("/sdcard/TMP.DB");
    var dst = new java.io.File("/sdcard/TMP10.DB");

    var src2 = new java.io.File("/sdcard/TMP2.DB");
    var dst2 = new java.io.File("/sdcard/TMP12.DB");

    var inputStreamIn = new java.io.FileInputStream(dst);
    var outputStreamOut = new java.io.FileOutputStream(src);
    var buf = new java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
    var len;
    while ((len = inputStreamIn.read(buf)) > 0) {
        outputStreamOut.write(buf, 0, len);
    }

    var inputStreamIn2 = new java.io.FileInputStream(dst2);
    var outputStreamOut2 = new java.io.FileOutputStream(src2);
    var buf2 = new java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
    var len2;
    while ((len2 = inputStreamIn2.read(buf2)) > 0) {
        outputStreamOut2.write(buf2, 0, len2);
    }
}

function setRoom(chat_id) {
    if (!room[chat_id]) {
        DBt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
        var cursor = DB.rawQuery("select link_id from chat_rooms where id=" + chat_id, null);
        var link = getR(cursor);
        var cursor = DBt.rawQuery("select name from open_link where id=" + link, null);
        room[chat_id] = getR(cursor);
        DBt.close();
    }
}

function settUser(user_id) {
    if (!user[user_id]) {
        DBt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
        var cursor = DBt.rawQuery("select name,v,enc from friends where id=" + user_id, null);
        data = getU(cursor);
        DBt.close();
    }
}

function getOwnKey() {
    DBt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
    var cursor = DBt.rawQuery("select user_id from open_profile limit 1", null);
    cursor.moveToNext();
    var data = cursor.getString(0);
    DBt.close();
    return data;
}

function getChatInfo(_id) {
    var collums = [
        "_id", //auto increment KEY
        "id", //??
        "type", //0:room enter/leave, 1:message, 2:photo, 3:video, 5,voice, 6,emoticon(gif), 12:emoticon(png), 14:vote?, 16:location, 17:profile, 18:long text,20:emoticon(webp), 22:emoticon?, 23:#search, 24:notice?, 25:emotice(webp)?, 26:reply, 27:photo group,  71:??, 98:notice, 16385 - ??
        "chat_id", //??
        "user_id", //userId
        "message", //encryptedMessage
        "attachment", //information about special message(not type 1)
        "created_at", //created time
        "deleted_at", //deleted time, 0 means not deleted
        "client_message_id", //??
        "prev_id", //??
        "referer", //??
        "supplement", //?
        "v" //some information about message. below is property of v.
    ];

    var cur = DB.rawQuery("SELECT * FROM chat_logs WHERE chat_id = ?", [_id]);
    cur.moveToNext();

    var ret = {};

    for (var idx in collums) {
        ret[collums[idx]] = cur.getString(idx);
    }
    ret.v = JSON.parse(ret.v);

    var keyCacheKey = ret.user_id + ret.v.enc;
    if (keyCache[keyCacheKey] == undefined) {
        var key = deriveKey(ret.user_id, ret.v.enc);
        keyCache[keyCacheKey] = key;
    } else {
        var key = keyCache[keyCacheKey];
    }

    ret.message = decrypt(key, ret.message);
    ret.attachment = decrypt(key, ret.attachment);

    return ret;
}

function getUserInfo(userId) {
    var collums = [
        "_id", //auto increment KEY
        "contact_id", //
        "id", //***user id***
        "type", //
        "uuid", //*encrypted* kakao id
        "phone_number", //
        "raw_phone_number", //
        "name", //*encrypted* current name
        "phonetic_name", //
        "profle_image_url", //*encrypted* 
        "full_profile_image_url", //*encrypted* 
        "original_profile_image_url", //*encrypted* original size profile image url
        "status_message", //*encrypted*
        "chat_id", //
        "brand_new", //
        "blocked", //
        "favorite", //
        "position", //
        "v", //*encrypted* 
        "board_v", //*encrypted*
        "ext", //
        "nick_name", //
        "user_type", //
        "story_user_id", //
        "accout_id", //
        "linked_services", //
        "hidden", //
        "purged", //
        "suspended", //
        "member_type", //
        "involved_chat_ids", //
        "contact_name", //
        "enc", //*** encrypted type ***
        "created_at", //
        "new_badge_updated_at", //
        "new_badge_seen_at", //
        "status_action_token" //
    ];

    var cur = DB2.rawQuery("SELECT * FROM friends WHERE id = ?", [userId]);
    cur.moveToNext();

    var ret = {};

    for (var idx in collums) {
        ret[collums[idx]] = cur.getString(idx);
    }

    ret.name = decrypt(myIdCache[ret.enc], ret.name);
    ret.uuid = decrypt(myIdCache[ret.enc], ret.uuid);
    ret.profle_image_url = decrypt(myIdCache[ret.enc], ret.profle_image_url);
    ret.full_profile_image_url = decrypt(myIdCache[ret.enc], ret.full_profile_image_url);
    ret.original_profile_image_url = decrypt(myIdCache[ret.enc], ret.original_profile_image_url);
    ret.v = decrypt(myIdCache[ret.enc], ret.v);
    ret.board_v = decrypt(myIdCache[ret.enc], ret.board_v);

    return ret;
}