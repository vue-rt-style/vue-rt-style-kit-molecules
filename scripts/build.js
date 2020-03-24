const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const terser = require('terser')

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist')
}

let {config, opts} = require('./config')

// filter builds via command line arg


buildEntry(config)

// function build (builds) {
//     let built = 0
//     // const total = builds.length
//     buildEntry(build())
//     const next = () => {
//         // console.info('builds',build)
//         buildEntry(build())
//         // buildEntry(builds[built]).then(() => {
//         //     built++
//         //     if (built < total) {
//         //         next()
//         //     }
//         // }).catch(logError)
//     }
//
//     // next()
// }

function buildEntry (config) {

    const output = config.output

    const { file, banner } = output
    const isProd = /(min|prod)\.js$/.test(file)
    console.info('###config',file,Object.keys(output),output);
    return rollup.rollup(config)
        .then((bundle) => {
            return bundle.generate(output)
        })
        .then((output) => {
            // console.info('-->> ',Object.keys(output.output))
            const primises = []
            output.output.forEach((o)=>{
                if(o.isAsset){
                    // console.info('***',config.assetPath+'/'+o.fileName)
                    primises.push(write(opts.assetPath+'/'+o.fileName, o.source, true))
                }
                console.info('**',Object.keys(o))
            })
            const code = output.output[0].code;

            if (isProd) {
                const minified = (banner ? banner + '\n' : '') + terser.minify(code, {
                    toplevel: true,
                    output: {
                        ascii_only: true
                    },
                    compress: {
                        pure_funcs: ['makeMap']
                    }
                }).code;

                primises.push(write(file, minified, true))
            } else {
                primises.push(write(file, code))
            }
            console.info('file',file)
            return Promise.all(primises);
        })
}

function write (dest, code, zip) {
    return new Promise((resolve, reject) => {
        function report (extra) {
            console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
            resolve()
        }

        fs.writeFile(dest, code, err => {
            if (err) return reject(err)
            if (zip) {
                zlib.gzip(code, (err, zipped) => {
                    if (err) return reject(err)
                    report(' (gzipped: ' + getSize(zipped) + ')')
                })
            } else {
                report()
            }
        })
    })
}

function getSize (code) {
    return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
    console.log(e)
}

function blue (str) {
    return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
