android=Packages.android
DBCopy()
mPath = "/sdcard/TMP.db"
mPath2 = "/sdcard/TMP2.db"
ownKey = getOwnKey()

room = {}
user = {}

datas = [];

function getChatData(cursor) {
    tmp = []
    for (i = 0; i < cursor.getCount(); i++) {
        for (j = 0; cursor.moveToNext(); j++) {
            tmp.push({
                "chat_id": cursor.getString(0),
                "user_id": cursor.getString(1),
                "message": JSON.parse(Decrypt(cursor.getString(1), JSON.parse(cursor.getString(3)).enc, cursor.getString(2))),
                "v": JSON.parse(cursor.getString(3)),
                "attachment": cursor.getBlob(4)
            })
        }
    }
    return tmp
}

function getU(cursor) {
    tmp = []
    for (i = 0; i < cursor.getCount(); i++) {
        for (j = 0; cursor.moveToNext(); j++) {
            tmp.push({
                "name": cursor.getString(0),
                "v": JSON.parse(cursor.getString(1)),
                "enc": cursor.getString(2)
            })
        }
    }
    return tmp
}

function getR(cursor) {
    while (cursor.moveToNext()) {
        try {
            return cursor.getString(0)
        } catch (e) {
            return ""
        }
    }
}

function toJavaByteArr(arr) {
    var B = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, arr.length);
    for (var i = 0; i < arr.length; i++) {
        B[i] = new java.lang.Integer(arr[i]).byteValue()
    }
    return B;
}

function arraycopy(srcArr, srcPos, destArr, destPos, length) {
    for (var i = 0; i < length; i++) {
        destArr[destPos + i] = srcArr[srcPos + i]
    }
}

function initArray(size, fill) {
    var arr = new Array(size);
    for (var i = 0; i < size; i++) {
        arr[i] = fill
    }
    return arr;
}

function genSalt(userId, encType) {
    if (userId <= 0) {
        return '\0'.repeat(16)
    }
    var prefixes = ['', '', '12', '24', '18', '30', '36', '12', '48', '7', '35', '40', '17', '23', '29', 'isabel', 'kale', 'sulli', 'van', 'merry', 'kyle', 'james', 'maddux', 'tony', 'hayden', 'paul', 'elijah', 'dorothy', 'bran']
    var salt = (prefixes[encType] + userId).slice(0, 16)
    salt = salt + '\0'.repeat(16 - salt.length)
    return new java.lang.String(salt).getBytes("UTF-8").slice()
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
    var salt = genSalt(userId, encType)
    var password = [0, 22, 0, 8, 0, 9, 0, 111, 0, 2, 0, 23, 0, 43, 0, 8, 0, 33, 0, 33, 0, 10, 0, 16, 0, 3, 0, 3, 0, 7, 0, 6, 0, 0]
    var iterations = 2;
    var dkeySize = 32;
    var v = 64; //hash block size
    var u = 20; //hash digest size

    var D = initArray(v, 1)
    var S = initArray(v * Math.floor((salt.length + v - 1) / v), 0);
    for (var i in S) {
        S[i] = salt[i % salt.length]
    }
    var P = initArray(v * Math.floor((password.length + v - 1) / v), 0);
    for (var i in P) {
        P[i] = password[i % password.length]
    }
    var I = S.concat(P)
    var B = initArray(v, 0)

    var c = Math.floor((dkeySize + u - 1) / u)
    var dKey = initArray(dkeySize, 0)

    for (var i = 1; i <= c; i++) {
        var hasher = java.security.MessageDigest.getInstance("SHA-1");
        hasher.update(toJavaByteArr(D))
        hasher.update(toJavaByteArr(I))
        var A = hasher.digest()

        for (var j = 1; j < iterations; j++) {
            hasher = java.security.MessageDigest.getInstance("SHA-1");
            hasher.update(A)
            A = hasher.digest()
        }

        for (var j = 0; j != B.length; j++) {
            B[j] = A[j % A.length];
        }

        for (var j = 0; j != I.length / v; j++) {
            adjust(I, j * v, B);
        }

        if (i == c) {
            arraycopy(A, 0, dKey, (i - 1) * u, dKey.length - ((i - 1) * u))
        } else {
            arraycopy(A, 0, dKey, (i - 1) * u, A.length);
        }
    }

    return dKey
}

function b64AESDecrypt(key, iv, encrypted) {
    encrypted = android.util.Base64.decode(encrypted, 0);
    iv = new javax.crypto.spec.IvParameterSpec(iv)
    key = new javax.crypto.spec.SecretKeySpec(key, "AES")
    var cipher = new javax.crypto.Cipher.getInstance("AES/CBC/PKCS5PADDING")
    cipher.init(2, key, iv) //2 is DECRYPT MODE
    return cipher.doFinal(encrypted)
}

function decrypt(key, b64CipherText) {
    try {
        var iv = [15, 8, 1, 0, 25, 71, 37, 220, 21, 245, 23, 224, 225, 21, 12, 53];
        var decrypted = b64AESDecrypt(toJavaByteArr(key), toJavaByteArr(iv), b64CipherText)
        return String(new java.lang.String(decrypted, "utf-8"));
    } catch (err) {
        return b64CipherText
    }
}

function Decrypt(id, enc, str) {
    return b.decrypt(b.deriveKey(id, enc), str)
}

function DBCopy() {
    try {
        var a = read("/data/data/com.excelliance.multiaccounts/gameplugins/com.kakao.talk/databases/KakaoTalk.db")
        var b = read("/data/data/com.excelliance.multiaccounts/gameplugins/com.kakao.talk/databases/KakaoTalk2.db")

        save(mPath, a)
        save(mPath2, b)
    } catch (e) {
        e.toString()
    }
}

function save(a, b) {
    var c = new java.io.File(a);
    var d = new java.io.FileOutputStream(c);
    var e = new java.lang.String(b);
    d.write(e.getBytes());
    d.close();
}

function read(a) {
    var b = new java.io.File(a);
    var c = new java.io.FileInputStream(b);
    var d = new java.io.InputStreamReader(c);
    var e = new java.io.BufferedReader(d);
    var f = e.readLine();
    var g = "";
    while ((g = e.readLine()) != null) {
        f += "\n" + g;
    }
    c.close();
    d.close();
    e.close();
    return f + "";
}

function getRoom(chat_id) {
    if (!room[chat_id]) {
        dbt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
        var cursor = db.rawQuery("select link_id from chat_rooms where id=" + chat_id, null)
        var link = getR(cursor)
        var cursor = dbt.rawQuery("select name from open_link where id=" + link, null)
        room[chat_id] = getR(cursor)
        dbt.close()
    }
}

function getUser(user_id) {
    if (!user[user_id]) {
        dbt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
        var cursor = dbt.rawQuery("select name,v,enc from friends where id=" + user_id, null)
        tmp = getU(cursor)
        dbt.close()
    }
}

function getOwnKey() {
    dbt = android.database.sqlite.SQLiteDatabase.openDatabase(mPath2, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
    var cursor = dbt.rawQuery("select user_id from open_profile limit 1", null)
    cursor.moveToNext()
    var tmp = cursor.getString(0)
    dbt.close()
    return tmp
}

try {
    DBCopy()
    db = android.database.sqlite.SQLiteDatabase.openDatabase(mPath, null, android.database.sqlite.SQLiteDatabase.CREATE_IF_NECESSARY);
    var cur = db.rawQuery("select chat_id,user_id,message,v,attachment from chat_logs where v LIKE '%NEWMEM%' ORDER BY id DESC LIMIT 1", null)
    c = getChatData(cur)

    getRoom(c[0].chat_id)
    datas.push(room[c[0].chat_id])
    datas.push(c[0].message.members[0].nickName)
    db.close()
    datas.join("\n\n")
} catch (e) {
    datas.push(e)
    datas.join("\n\n")
}
