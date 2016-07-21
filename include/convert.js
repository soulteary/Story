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
        case 11:
            console.error('Post时间出现问题.', param.post);
            break;
        case 12:
            console.error('argv dist 出现问题.', param.msg);
            break;
        case 13:
            showWarnning && console.warn('[目标路径不存在, 尝试创建路径]', param.dist);
            break;

    }
    return false;
}

function makeupPost (post, config, json) {

    let postDate = null;
    if (config.virtual) {
        try {
            postDate = moment(json.date).format('YYYY-MM-DD HH:mm:ss');
        } catch (e) {
            // 如果转换发生错误,使用当前时间
            postDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
            errorhandle({code: 11, post: post});
        }
    } else {
        postDate = moment(new Date(json.date.replace('+0000', '+8'))).format('YYYY-MM-DD HH:mm:ss');
    }

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

    // todo 处理同名

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
}

function getVirtualMeta (post, config) {

    // date
    let date = null;
    let pathDate = path.dirname(post).match(/\d{4}\/\d{2}\/\d{2}$/);

    if (pathDate) {
        date = new Date(pathDate[0]);
    } else {
        date = fs.statSync(post).ctime.getTime();
    }

    // slug
    let slug = path.basename(post);
    slug = slug.substring(0, slug.length - 3);

    // title
    let title = fs.readFileSync(post).toString();
    if (title.length) {
        let firstHeadline = title.trim().match(/(#){1,}(\s?)(.*)(\n)/);
        if (firstHeadline) {
            title = firstHeadline[3]
        } else {
            let posNewline = title.indexOf('\n');
            if (posNewline > -1) title = title.substring(0, posNewline);

            let posEnd = title.indexOf("。");
            if (posEnd > -1) title = title.substring(0, posEnd);

            if (posEnd === posNewline && posEnd === -1) title = title.substring(0, 10);
        }
    } else {
        title = slug;
    }

    return {
        date : date,
        slug : slug,
        title: title
    };
}

function parseHexo (data) {

    if (data.less && typeof data.less === 'number') data.post.splice(0, data.post.length - data.less);

    let result = true;

    data.post.map(function (post) {
        let metaPath = post.slice(0, -2) + 'json';
        let config = {};
        config.dist = data.dist;

        let jsonContent = null;
        if (data.meta.indexOf(metaPath) > -1) {
            try {
                jsonContent = fs.readJSONSync(metaPath);
            } catch (e) {
                result = false;
                return errorhandle({code: 10, post: post, error: e});
            }
        } else {
            config.virtual = true;
            jsonContent = getVirtualMeta(post, config);
        }
        return makeupPost(post, config, jsonContent);
    });

    return result;
}

module.exports = function (argv) {
    console.info('CLI argv:');
    console.info(argv);
    if (argv.convert && argv.dist) {
        fs.exists(argv.dist).then(function (exist) {
            if (!exist) {
                fs.mkdirs(argv.dist);
                errorhandle({code: 13, dist: argv.dist});
            }
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
        }).catch(function (err) {
            return errorhandle({code: 12, msg: err})
        });
    } else {
        return errorhandle({code: 9});
    }
};