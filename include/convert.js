'use strict'

const path = require('path');
const util = require('story-utils');
const fs = require('story-fs');
const moment = require('moment');

const console = require('better-console');
const showWarnning = false;

const suffix = '.html';

/**
 * trim array
 * @param arr
 * @returns {*}
 */
function trimArray (arr) {
    return arr ? arr.filter(function (v) {return v;}) : [];
}

function containChinese (str) {
    return str.match(/.*[\u4e00-\u9fa5]+.*$/);
}

function errorhandle (param) {
    //code, post, config, meta, content, dist
    switch (param.code) {
        case 1:
            console.error('Post Meta 出现问题', param.post);
            break;
        case 2:
            console.error('缺少标题:', param.post);
            break;
        case 3:
            console.error('缺少文件名称', param.post);
            break;
        case 4:
            console.error('缺少时间:', param.post);
            break;
        case 5:
            console.error('文章缺少内容:', param.post, '\n');
            break;
        case 6:
            showWarnning && console.warn('[文章已经存在]', param.dist);
            break;
        case 7:
            console.error('写入文件失败', param.post);
            console.log('失败原因', param.msg);
            break
        case 8:
            console.error('[扫描文件失败]', param.msg);
            break
        case 9:
            console.error('CLI argv error.');
            break
        case 10:
            console.error('Post Meta Json error.', param.post);
            break;
    }
    return false;
}

function makeupPost (post, config) {
    return fs.readJSON(config.meta).then(function (json) {

        // convert posts date to hexo meta format
        const postDate = moment(new Date(json.date.replace('+0000', '+8'))).format('YYYY-MM-DD HH:mm:ss');

        json.category = trimArray(json.category);
        json.tag = trimArray(json.tag);
        if (json.alias) {
            if (typeof json.alias === 'string') {
                json.alias = [json.alias];
            } else {
                if (!Array.isArray(json.alias)) return errorhandle({
                    code  : 1,
                    post  : post,
                    config: config
                });
            }
        }
        // make sure alias field exist
        json.alias = trimArray(json.alias);

        let postMeta = [];
        const separ = '---';

        postMeta.push(separ);

        if (!json.title) return errorhandle({
            code  : 2,
            post  : post,
            config: config
        });
        postMeta.push(`title: "${json.title}"`);

        if (!json.slug) return errorhandle({
            code  : 3,
            post  : post,
            config: config,
            meta  : postMeta
        });

        if (!json.date) return errorhandle({
            code  : 4,
            post  : post,
            config: config,
            meta  : postMeta
        });
        postMeta.push(`date: "${postDate}"`);

        //todo 考虑符号合法
        if (json.tag.length) postMeta.push(`tags: ${JSON.stringify(json.tag)}`);

        //todo 考虑字段
        if (json.category.length) postMeta.push(`categories: ${JSON.stringify(json.category)}`);

        //todo
        if (json.alias.length) {
            let baseDir = postDate.replace(/^(\d+\-\d+\-\d+).*/, '/$1').replace(/\-/g, '/');
            let useAlias = false;
            let subAlias = [];

            json.alias.map(function (v) {
                let aliasKey = decodeURIComponent(v);
                if (containChinese(aliasKey)) {
                    console.info('[处理包含中文的alias]', post);
                }

                // suffix already existed.
                //todo -html
                if (aliasKey.slice(suffix.length * -1) !== suffix) {
                    subAlias.push(`    - "${baseDir}/${aliasKey}${suffix}"`);
                    useAlias = true;
                }

                let errorAlias = suffix.replace('.', '-');
                if (aliasKey.slice(suffix.length * -1) === errorAlias) {
                    json.slug = json.slug.slice(0, errorAlias.length * -1) + suffix;
                    console.info('将错误的后缀变为alias,并修正suffix', json.slug);
                    subAlias.push(`    - "${baseDir}/${aliasKey}${errorAlias}"`);
                    useAlias = true;
                }
            });

            if (useAlias) {
                postMeta.push(`alias:`);
                postMeta = postMeta.concat(subAlias);
            }
        }
        postMeta.push(separ);
        postMeta.push('\n');

        postMeta = postMeta.join('\n');

        return fs.readFile(post).then(function (contentBuffer) {
            let content = contentBuffer.toString();

            if (!content) return errorhandle({
                code   : 5,
                post   : post,
                config : config,
                meta   : postMeta,
                content: content,
                dist   : distPath
            });

            const distPath = path.resolve(config.dist, decodeURIComponent(json.slug) + '.md');

            return fs.stat(distPath).then(function () {
                return errorhandle({
                    code   : 6,
                    post   : post,
                    config : config,
                    meta   : postMeta,
                    content: content,
                    dist   : distPath
                });
            }).catch(function (e) {
                if (e.errno === -2) {
                    let ctx = content.toString();
                    ctx = ctx.replace(/^(\s+)?#\s*.+\n/, '');
                    return fs.writeFile(distPath, postMeta + ctx);
                } else {
                    return errorhandle({code: 7, post: post, msg: e});
                }
            });
        });
    })
}

function parseHexo (data) {

    if (data.less && typeof data.less === 'number') data.post.splice(0, data.post.length - data.less);

    data.post.map(function (post) {
        let metaPath = post.slice(0, -2) + 'json';
        let config = {};
        let pathDate = path.dirname(post).match(/\d{4}\/\d{2}\/\d{2}/);
        config.date = pathDate ? pathDate[0] : null;
        config.dist = data.dist;

        if (data.meta.indexOf(metaPath) > -1) {
            config.meta = metaPath;
            return makeupPost(post, config);
        } else {
            config.meta = null;
            return errorhandle({code: 10, post: post});
        }
    });
    return true;
}

module.exports = function (argv) {
    console.info('CLI argv:');
    console.info(argv);
    if (argv.convert && argv.dist) {
        util.posts.scanDir(argv.convert, []).then(function (resp) {
            return util.posts.sortOutPath(resp).then(function (data) {
                data.dist = argv.dist;
                data.less = argv.less;
                delete data.dir;
                return parseHexo(data);
            });
        }).catch(function (err) {
            return errorhandle({code: 8, msg: err});
        });
    } else {
        return errorhandle({code: 9});
    }
};