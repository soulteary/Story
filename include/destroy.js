'use strict';
const fs = require('story-fs');

module.exports = function (target) {
    return new Promise(function (resolve, reject) {
        return fs.del(target).then(function () {
            console.log('clean website item');
            return resolve(true);
        }).then(function (e) {
            return reject(e);
        }).catch(function (e) {
            return reject(e)
        });
    });
};

