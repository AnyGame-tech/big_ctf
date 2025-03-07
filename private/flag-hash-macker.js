const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync("flag{test_osint}", 10));
