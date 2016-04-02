'use strict'

const fs = require('story-fs');

module.exports = function (target) {
    return new Promise(function (resolve, reject) {
        console.log('clean website item');
        fs.del(target).then(function () {
            resolve(true);
        }).then(function (e) {
            reject(e);
        });
    });
};

