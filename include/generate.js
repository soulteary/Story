'use strict';

//var generateCategory = require('story-generate-category');
//var generateFeed = require('story-generate-feed');
//var generatePage = require('story-generate-page');
//var generateSitemap = require('story-generate-sitemap');
//var generateTag = require('story-generate-tag');

var generateArchive = require('./generate/archivePage');

module.exports = function() {
  return new Promise(function(resolve, reject) {
    console.log('begin generate website');
    try {
      resolve(generateArchive());
    } catch (e) {
      reject(e);
    }
  });
};