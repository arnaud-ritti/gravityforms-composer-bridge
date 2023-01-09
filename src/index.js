/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
addEventListener('fetch', event => {
    event.respondWith(
        handleRequest(event.request).catch(err => {
            const message = JSON.stringify(err.reason || err.stack || 'Unknown Error', null, 2)

            return new Response(message, {
                status: err.status || 500,
                statusText: err.statusText || null,
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    // Disables caching by default.
                    'Cache-Control': 'no-store',
                    // Returns the "Content-Length" header for HTTP HEAD requests.
                    'Content-Length': message.length,
                }
            })
        })
    )
})

async function handleRequest(request) {
    const {
        protocol,
        pathname,
        searchParams
    } = new URL(request.url)

    // In the case of a "Basic" authentication, the exchange 
    // MUST happen over an HTTPS (TLS) connection to be secure.
    if ('https:' !== protocol || 'https' !== request.headers.get('x-forwarded-proto')) {
        throw new BadRequestException('Please use a HTTPS connection.')
    }
    if (!request.headers.has('Authorization')) {
        return new Response('You need to login.', {
            status: 401,
            headers: {
                // Prompts the user for credentials.
                'WWW-Authenticate': 'Basic realm="Gravity Forms Composer Repository", charset="UTF-8"'
            }
        })
    }
    const {
        user,
        pass
    } = basicAuthentication(request);
    verifyCredentials(user, pass);

    let url = null;

    switch (pathname) {
        case "/wordpress-plugin/packages.json":
        case "/wordpress-plugin":
            url = "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-plugin/packages.json";
            return getPackages(url);
            break;
        case "/wordpress-muplugin/packages.json":
        case "/wordpress-muplugin":
            url = "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-muplugin/packages.json"
            return getPackages(url);
            break;
        case "/library/packages.json":
        case "/library":
            url = "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/library/packages.json"
            return getPackages(url);
            break;
        case "/wpackagist-plugin/packages.json":
        case "/wpackagist-plugin":
            url = "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wpackagist-plugin/packages.json"
            return getPackages(url);
            break;
        case "/download":
            url = new URL("https://gravityapi.com/wp-content/plugins/gravitymanager/api.php?op=get_plugin");
            url.searchParams.set('slug', searchParams.get('slug'));
            url.searchParams.set('key', pass);
            return getDownload(url);
            break;
        default:
            throw new NotFoundRequestException("Unknown repository");
    }
}

/**
 * @param {string} url
 */
async function getPackages(url) {
    const init = {
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
    }
    const response = await fetch(url, init);
    let json = await response.json();
    json = {
        ...json,
        packages: {
            ...json.packages,
            ...objectMap(json.packages, plugin => {
                return objectMap(plugin, (p, k) => {
                    const oldUrl = new URL(p.dist.url);
                    const newUrl = new URL("https://gf-composer-proxy.arnaud-ritti.workers.dev/download");
                    newUrl.searchParams.set('slug', oldUrl.searchParams.get('slug'));
                    return {
                        ...p,
                        dist: {
                            ...p.dist,
                            url: newUrl.toString()
                        },
                        require: {
                            "composer/installers": "^1.0 || ^2.0"
                        }
                    };
                })
            })
        }
    };

    const newResponse = new Response(JSON.stringify(json, null, 2), response);
    newResponse.headers.set("Cache-Control", "no-store")
    return newResponse;
}

async function getDownload(url) {
    const response = await fetch(url);
    const body = await response.text();
    const datas = unserialize(body);
    if (datas["download_url_latest"]) {
        const downloadURL = new URL(datas["download_url_latest"]);
        let path = downloadURL.pathname;
        let filename = new String(path).substring(path.lastIndexOf('/') + 1);
        const response = await fetch(datas["download_url_latest"]);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("Cache-Control", "no-store")
        newResponse.headers.set("Content-Disposition", `attachment; filename=${filename}`)
        return newResponse;
    }
    throw new NotFoundRequestException("Unknown download");
}

/**
 * Throws exception on verification failure.
 * @param {string} user
 * @param {string} pass
 * @throws {UnauthorizedException}
 */
function verifyCredentials(user, pass) {
    if ("licensekey" !== user) {
        throw new UnauthorizedException('Invalid username, please use licensekey as username.')
    }
}

/**
 * Parse HTTP Basic Authorization value.
 * @param {Request} request
 * @throws {BadRequestException}
 * @returns {{ user: string, pass: string }}
 */
function basicAuthentication(request) {
    const Authorization = request.headers.get('Authorization')

    const [scheme, encoded] = Authorization.split(' ')

    // The Authorization header must start with "Basic", followed by a space.
    if (!encoded || scheme !== 'Basic') {
        throw new BadRequestException('Malformed authorization header.')
    }

    // Decodes the base64 value and performs unicode normalization.
    // @see https://datatracker.ietf.org/doc/html/rfc7613#section-3.3.2 (and #section-4.2.2)
    // @see https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
    const decoded = atob(encoded).normalize()

    // The username & password are split by the first colon.
    //=> example: "username:password"
    const index = decoded.indexOf(':')

    // The user & password are split by the first colon and MUST NOT contain control characters.
    // @see https://tools.ietf.org/html/rfc5234#appendix-B.1 (=> "CTL = %x00-1F / %x7F")
    if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
        throw new BadRequestException('Invalid authorization value.')
    }

    return {
        user: decoded.substring(0, index),
        pass: decoded.substring(index + 1),
    }
}

function UnauthorizedException(reason) {
    this.status = 401
    this.statusText = 'Unauthorized'
    this.reason = reason
}

function BadRequestException(reason) {
    this.status = 400
    this.statusText = 'Bad Request'
    this.reason = reason
}

function NotFoundRequestException(reason) {
    this.status = 404
    this.statusText = 'Not found'
    this.reason = reason
}


const objectMap = (obj, fn) =>
    Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    )


/**
 * Unserialize data taken from PHP's serialize() output
 *
 * Taken from https://github.com/kvz/phpjs/blob/master/functions/var/unserialize.js
 * Fixed window reference to make it nodejs-compatible
 *
 * @param string serialized data
 * @return unserialized data
 * @throws
 */
function unserialize(data) {
    // http://kevin.vanzonneveld.net
    // +     original by: Arpad Ray (mailto:arpad@php.net)
    // +     improved by: Pedro Tainha (http://www.pedrotainha.com)
    // +     bugfixed by: dptr1988
    // +      revised by: d3x
    // +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +        input by: Brett Zamir (http://brett-zamir.me)
    // +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     improved by: Chris
    // +     improved by: James
    // +        input by: Martin (http://www.erlenwiese.de/)
    // +     bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     improved by: Le Torbi
    // +     input by: kilops
    // +     bugfixed by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Jaroslaw Czarniak
    // %            note: We feel the main purpose of this function should be to ease the transport of data between php & js
    // %            note: Aiming for PHP-compatibility, we have to translate objects to arrays
    // *       example 1: unserialize('a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}');
    // *       returns 1: ['Kevin', 'van', 'Zonneveld']
    // *       example 2: unserialize('a:3:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";s:7:"surName";s:9:"Zonneveld";}');
    // *       returns 2: {firstName: 'Kevin', midName: 'van', surName: 'Zonneveld'}
    var that = this,
        utf8Overhead = function (chr) {
            // http://phpjs.org/functions/unserialize:571#comment_95906
            var code = chr.charCodeAt(0);
            if (code < 0x0080) {
                return 0;
            }
            if (code < 0x0800) {
                return 1;
            }
            return 2;
        },
        error = function (type, msg, filename, line) {
            console.error(type, msg, filename, line);
            throw new BadRequestException('Invalid authorization value.')
        },
        read_until = function (data, offset, stopchr) {
            var i = 2,
                buf = [],
                chr = data.slice(offset, offset + 1);

            while (chr != stopchr) {
                if ((i + offset) > data.length) {
                    error('Error', 'Invalid');
                }
                buf.push(chr);
                chr = data.slice(offset + (i - 1), offset + i);
                i += 1;
            }
            return [buf.length, buf.join('')];
        },
        read_chrs = function (data, offset, length) {
            var i, chr, buf;

            buf = [];
            for (i = 0; i < length; i++) {
                chr = data.slice(offset + (i - 1), offset + i);
                buf.push(chr);
                length -= utf8Overhead(chr);
            }
            return [buf.length, buf.join('')];
        },
        _unserialize = function (data, offset) {
            var dtype, dataoffset, keyandchrs, keys,
                readdata, readData, ccount, stringlength,
                i, key, kprops, kchrs, vprops, vchrs, value,
                chrs = 0,
                typeconvert = function (x) {
                    return x;
                },
                readArray = function () {
                    readdata = {};

                    keyandchrs = read_until(data, dataoffset, ':');
                    chrs = keyandchrs[0];
                    keys = keyandchrs[1];
                    dataoffset += chrs + 2;

                    for (i = 0; i < parseInt(keys, 10); i++) {
                        kprops = _unserialize(data, dataoffset);
                        kchrs = kprops[1];
                        key = kprops[2];
                        dataoffset += kchrs;

                        vprops = _unserialize(data, dataoffset);
                        vchrs = vprops[1];
                        value = vprops[2];
                        dataoffset += vchrs;

                        readdata[key] = value;
                    }
                };

            if (!offset) {
                offset = 0;
            }
            dtype = (data.slice(offset, offset + 1)).toLowerCase();

            dataoffset = offset + 2;

            switch (dtype) {
                case 'i':
                    typeconvert = function (x) {
                        return parseInt(x, 10);
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'b':
                    typeconvert = function (x) {
                        return parseInt(x, 10) !== 0;
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'd':
                    typeconvert = function (x) {
                        return parseFloat(x);
                    };
                    readData = read_until(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'n':
                    readdata = null;
                    break;
                case 's':
                    ccount = read_until(data, dataoffset, ':');
                    chrs = ccount[0];
                    stringlength = ccount[1];
                    dataoffset += chrs + 2;

                    readData = read_chrs(data, dataoffset + 1, parseInt(stringlength, 10));
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 2;
                    if (chrs != parseInt(stringlength, 10) && chrs != readdata.length) {
                        error('SyntaxError', 'String length mismatch');
                    }
                    break;
                case 'a':
                    readArray();
                    dataoffset += 1;
                    break;
                case 'o':
                    ccount = read_until(data, dataoffset, ':');
                    dataoffset += ccount[0] + 2;

                    ccount = read_until(data, dataoffset, '"');
                    dataoffset += ccount[0] + 2;

                    readArray();
                    dataoffset += 1;
                    break;
                default:
                    error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype);
                    break;
            }
            return [dtype, dataoffset - offset, typeconvert(readdata)];
        };

    return _unserialize((data + ''), 0)[2];
}