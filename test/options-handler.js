// Copyright (c) 2018, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
const OptionsHandler = require('../lib/options-handler');
const _ = require('underscore');
const properties = require('../lib/properties');

chai.use(chaiAsPromised);
const should = chai.should();

const languages = {
    fake: {
        id: 'fake'
    }
};

const libProps = {
    libs: 'fakelib',
    'libs.fakelib.name': 'fake lib',
    'libs.fakelib.description': 'Its is a real, fake lib!',
    'libs.fakelib.versions': 'onePath:twoPaths:noPaths',
    'libs.fakelib.url': 'https://godbolt.org',
    'libs.fakelib.versions.onePath.version': 'one path',
    'libs.fakelib.versions.onePath.path': '/dev/null',
    'libs.fakelib.versions.onePath.libpath': '/lib/null',
    'libs.fakelib.versions.onePath.liblink': 'hello',
    'libs.fakelib.versions.twoPaths.version': 'two paths',
    'libs.fakelib.versions.twoPaths.path': '/dev/null:/dev/urandom',
    'libs.fakelib.versions.twoPaths.libpath': '/lib/null:/lib/urandom',
    'libs.fakelib.versions.twoPaths.liblink': 'hello1:hello2',
    'libs.fakelib.versions.noPaths.version': 'no paths',
    'libs.fakelib.versions.noPaths.path': ''
};

if (process.platform === "win32") {
    libProps['libs.fakelib.versions.twoPaths.path'] =
        libProps['libs.fakelib.versions.twoPaths.path'].replace(':', ';');
    libProps['libs.fakelib.versions.twoPaths.libpath'] =
        libProps['libs.fakelib.versions.twoPaths.libpath'].replace(':', ';');
}

const compilerProps = new properties.CompilerProps(languages, properties.fakeProps(libProps));

const optionsHandler = new OptionsHandler([], compilerProps, {});


const makeFakeCompilerInfo = (id, lang, group, semver, isSemver) => {
    return {
        id: id,
        exe: '/dev/null',
        name: id,
        lang: lang,
        group: group,
        isSemVer: isSemver,
        semver: semver
    };
};

describe('Options handler', () => {
    it('should always return an array of paths', () => {
        const libs = optionsHandler.parseLibraries({'fake': libProps.libs});
        _.each(libs[languages.fake.id]['fakelib'].versions, version => {
            Array.isArray(version.path).should.equal(true);
        });
        libs.should.deep.equal({"fake": {
            "fakelib": {
                "description": "Its is a real, fake lib!",
                "name": "fake lib",
                "url": "https://godbolt.org",
                "versions": {
                        "noPaths": {"path": [], "version": "no paths", "liblink": [], "libpath": []},
                        "onePath": {"path": ["/dev/null"], "version": "one path",
                            "liblink": ["hello"],
                            "libpath": ["/lib/null"]},
                        "twoPaths": {"path": ["/dev/null", "/dev/urandom"],
                            "liblink": ["hello1", "hello2"],
                            "libpath": ["/lib/null", "/lib/urandom"], "version": "two paths"}
                }
            }
        }});
    });
    it('should order compilers as expected', () => {
        const compilers = [
            makeFakeCompilerInfo('a1', languages.fake.id, 'a', '0.0.1', true),
            makeFakeCompilerInfo('a2', languages.fake.id, 'a', '0.2.0', true),
            makeFakeCompilerInfo('a3', languages.fake.id, 'a', '0.2.1', true),

            makeFakeCompilerInfo('b1', languages.fake.id, 'b', 'trunk', true),
            makeFakeCompilerInfo('b2', languages.fake.id, 'b', '1.0.0', true),
            makeFakeCompilerInfo('b3', languages.fake.id, 'b', '0.5.0', true),

            makeFakeCompilerInfo('c1', languages.fake.id, 'c', '3.0.0', true),
            makeFakeCompilerInfo('c2', languages.fake.id, 'c', '3.0.0', true),
            makeFakeCompilerInfo('c3', languages.fake.id, 'c', '3.0.0', true),

            makeFakeCompilerInfo('d1', languages.fake.id, 'd', 1.0, true),
            makeFakeCompilerInfo('d2', languages.fake.id, 'd', '2.0.0', true),
            makeFakeCompilerInfo('d3', languages.fake.id, 'd', '0.0.5', true),

            makeFakeCompilerInfo('e1', languages.fake.id, 'e', '0..0', false),
            makeFakeCompilerInfo('e2', languages.fake.id, 'e', undefined, false),

            makeFakeCompilerInfo('f1', languages.fake.id, 'f', '5', true),
            makeFakeCompilerInfo('f2', languages.fake.id, 'f', '5.1', true),
            makeFakeCompilerInfo('f3', languages.fake.id, 'f', '5.2', true)
        ];
        const expectedOrder = {
            a: {
                a1: -0,
                a2: -1,
                a3: -2
            },
            b: {
                b1: -2,
                b2: -1,
                b3: -0
            },
            c: {
                c1: -0,
                c2: -1,
                c3: -2
            },
            d: {
                d1: -1,
                d2: -2,
                d3: -0
            },
            e: {
                e1: undefined,
                e2: undefined
            },
            f: {
                f1: -0,
                f2: -1,
                f3: -2
            }
        };
        optionsHandler.setCompilers(compilers);
        _.each(optionsHandler.get().compilers, compiler => {
            should.equal(compiler['$order'], expectedOrder[compiler.group][compiler.id], `group: ${compiler.group} id: ${compiler.id}`);
        });
        optionsHandler.setCompilers([]);
    });
});
