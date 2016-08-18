'use strict';

const fs = require('story-fs');

module.exports = function (target) {
    return new Promise(function (resolve, reject) {
        return fs.del(target)
            .then(function () {
                return resolve(true);
            }).catch(function (e) {
                return reject(e)
            });
    });
};