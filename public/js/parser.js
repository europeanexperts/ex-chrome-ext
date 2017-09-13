window.SOCIAL_PARSER = window.SOCIAL_PARSER || {};

(function () {
    'use strict';

    var CONFIG = {
        REFRESH_PROFILE_MESSAGE: 'REFRESH_PROFILE',
        FIND_EMAIL_MESSAGE     : 'FIND_EMAIL',
        IMPORT_PROFILE_MESSAGE : 'IMPORT_PROFILE',
        GET_PROFILE_MESSAGE    : 'GET_PROFILE',
        SAVE_PROFILE_MESSAGE   : 'SAVE_PROFILE'
    };

    var REFRESH_PROFILE_ACTION = 'action=euex';
    var PATTERNS = {
        PROFILE_URL: /^\/in\//
    };
    var SELECTORS = {
        TOTAL                 : '.search-results__total',
        SEARCH_RESULT         : '.results-list',
        SEARCH_RESULT_PROFILES: '.results-list li'
    };
    var PARSE_STATUSES = {
        CREATED  : 'created',
        STARTED  : 'started',
        PAUSED   : 'paused',
        RESTARTED: 'restarted',
        STOPPED  : 'stopped'
    };
    var _status = null;

    function ParseStatusError() {
        this.name = 'ParseStatusError';
        this.message = 'The parse status === "' + _status + '".';
        this.parseStatus = _status;
    }

    function checkParseStatus() {
        return _status === PARSE_STATUSES.STARTED  || _status === PARSE_STATUSES.RESTARTED;
    }

    function parseVisuallyHidden(str) {
        var rows;

        str = str || '';
        if (!str) {
            return '';
        }

        rows = str.split('\n');
        if (!rows || rows.length < 3) {
            console.warn('warn: parseVisuallyHidden function was called with invalid param "%s"', str);

            return '';
        }

        return rows[2].trim();
    }

    function parseEntityRange(str, options) {
        str = str || '';

        var defaults = ['', ''];
        var delimiter = (options && options.delimiter) || ' – ';
        var values = str.split(delimiter).map(function (item) {
            return item.trim();
        });

        return defaults.map(function (item, index) {
            return values[index] || defaults[index];
        });
    }

    function afterTag(str, options) {
        var tagName = (options && options.tagName) || '</span>';
        var index = str.indexOf(tagName);
        var result;

        if (index !== -1) {
            result = str.slice(index + tagName.length).trim(); // remove the span; ('</span>'.length === 7 !!!)
        } else {
            result = str.trim();
        }

        return result;
    }

    function parseSectionCount(options) {
        var $el = options.$el;
        var count = $el.find('h3 span:last').html() || '0';

        return  parseInt(count, 10);
    }

    function prepareSection(options, callback) {
        var $el = options.$el;
        var sectionName = options.sectionName;
        var sectionSelector = options.sectionSelector;
        var buttonSelector = options.buttonSelector || 'button.link';
        var totalCount = options.totalCount;
        var timeout = options.timeout || 50;
        var maxIterations = options.maxIterations || 200;

        $el.animate({scrollTop: $el.height()}, 1000, function () {
            var $items = $el.find(sectionSelector);
            var interval;
            var i = 0;

            var check = function() {
                if (totalCount) {
                    return ($el.find(sectionSelector).length === totalCount || (maxIterations < i));
                }

                return ($items.find('button.link').attr('aria-expanded') === "true" || (maxIterations < i));
            };

            if (totalCount === 0 || $el.find(buttonSelector).length === 0) {
                return callback(); // there is nothing to show more
            }

            $el.find('button.link').click();
            interval = setInterval(function () {
                if (check()) {
                    if (maxIterations < i) {
                        console.warn('Can not parse the %s.', sectionName);
                    }

                    clearInterval(interval);
                    return callback();
                }

                $el.find(buttonSelector).click();
                i++;
            }, timeout);
        });
    }

    function parseProfileCourses(options) {
        var $el = options.$el;
        var _courses = $el.find('li')
            .map(function () {
                var $li = $(this);

                return {
                    name: afterTag($li.find('h4').html())
                }
            })
            .toArray();

        return _courses;
    }

    function parseProfileExperience(options) {
        var _companies = $('section.experience-section ul.pv-profile-section__section-info > li')
            .map(function () {
                var $li = $(this);
                var dateHTML = $li.find('.pv-entity__date-range span:last').html() || '';
                var description = $li.find('.pv-entity__description').html() || '';

                return {
                    title      : $li.find('h3').html(),
                    company    : $li.find('.pv-entity__secondary-title').html(),
                    start_date : dateHTML.split(' – ')[0],
                    end_date   : dateHTML.split(' – ')[1],
                    description: description.trim()
                }
            })
            .toArray();

        return _companies;
    }

    function parseCertifications(options) {
        var $el = options.$el;
        var _certifications = $el.find('.pv-accomplishments-section .certifications li')
            .map(function () {
                var $li = $(this);
                var nameHTML;
                var name;
                var dateRangeHTML;
                var dateRange;
                var index;

                nameHTML = $li.find('h4').html() || '';
                index = nameHTML.indexOf('</span>');  // find the closing </span> tag:
                if (index !== -1) {
                    name = nameHTML.slice(index + 7).trim(); // remove the span; ('</span>'.length === 7 !!!)
                } else {
                    name = nameHTML.trim();
                }

                dateRangeHTML = $li.find('.pv-accomplishment-entity__date').html() || '';
                index = dateRangeHTML.indexOf('</span>');
                if (index !== -1) {
                    dateRangeHTML = dateRangeHTML.slice(index + 7).trim(); // remove the span; ('</span>'.length === 7 !!!)
                } else {
                    dateRangeHTML = dateRangeHTML.trim();
                }
                dateRange = parseEntityRange(dateRangeHTML);

                return {
                    name      : name,
                    start_date: dateRange[0],
                    end_date  : dateRange[1]
                }
            })
            .toArray();

        return _certifications;
    }

    function parseProjects(options) {
        var $el = options.$el;
        var _projects = $el.find('.pv-accomplishments-section .projects li')
            .map(function () {
                var $li = $(this);
                var prTitle = $li.find('h4').html();
                var prDescription = $li.find('.pv-accomplishment-entity__description').html();
                var dateRange = parseEntityRange($li.find('.pv-accomplishment-entity__date').html());

                return {
                    title      : parseVisuallyHidden(prTitle),
                    description: parseVisuallyHidden(prDescription),
                    start_date : dateRange[0],
                    end_date   : dateRange[1]
                };
            })
            .toArray();

        return _projects;
    }

    function parseProfileSummary(options) {
        var $el = options.$el;
        var $profileSummary = $el.find('.pv-top-card-section__summary');
        var $showMoreBtn = $profileSummary.find('button');

        if (!$showMoreBtn || !$showMoreBtn.length) {
            return $profileSummary.text();
        }

        if ($profileSummary.find('.truncate-multiline--truncation-target').length) {
            $showMoreBtn.click();
        }

        return $profileSummary.clone()
            .find('button').remove().end()
            .text();
    }

    function parseLocation(locationStr) {
        var arr = locationStr.split(',');
        var result = {
            country : '',
            location: ''
        };

        if (arr.length < 2) { // empty or one element. Can't different the city, region, country ...
            return result;
        }

        result.location = arr[0].trim();
        result.country = arr[arr.length - 1].trim();

        return result;
    }

    function getIdFromCompanyPath(str) {
        var _match;

        str = str || '';
        _match = str.match(/company(-beta)?\/([0-9]*)/);

        return (_match && _match[2]) || '';
    }

    function findEmail(options, callback) {
        chrome.runtime.sendMessage({type: CONFIG.FIND_EMAIL_MESSAGE, data: options}, function(result) {
            result = result || {};

            if (result.error) {
                return callback(result.error);
            }

            callback(null, result.success);
        });
    }

    function replaceAll(str, replaceObj) {
        var keys = Object.keys(replaceObj);

        keys.forEach(function (key) {
            var regExp = new RegExp(key, 'g');

            str.replace(regExp, replaceObj[key]);
        });

        return str;
    }

    function cleanName(name) {
        return name.split(/\s+/).length > 2 ? replaceAll(name, {
            ",? Jr.?": "",
            ",? Sr.?": "",
            ",? MBA" : "",
            ",? CPA" : "",
            ",? PhD" : "",
            ",? MD"  : "",
            ",? MHA" : "",
            ",? CGA" : "",
            ",? ACCA": "",
            ",? PMP" : "",
            ",? MSc" : ""
        }) : name;
    }

    function getNameObj(fullName) {
        var arr;
        var firstName;
        var lastName;

        fullName = fullName || $('.pv-top-card-section__name').html() || '';

        arr = fullName.split(' ');
        firstName = arr.shift();
        lastName = arr.join(' ');

        return {
            first_name: firstName,
            last_name : lastName
        };
    }

    function getNameObjFromCode(rows) {
        var objs = [];
        var profile;

        rows.forEach(function (obj) {
            if (obj.firstName && obj.lastName) {
                objs.push(obj);
            }
        });

        profile = (objs && objs[1]) || {};

        return {
            first_name: profile.firstName,
            last_name : profile.lastName
        }
    }

    function stringToNumber() {
        var len = this.length || 0;
        var str = this;

        var i = 0;
        var numStr = '';
        var numRegExp = /[0-9]/;

        while (i < len)  {
            if (numRegExp.test(str[i])) {
                numStr += str[i];
            }
            i++;
        }

        return parseInt(numStr, 10);
    }

    SOCIAL_PARSER.PARSE_STATUSES = PARSE_STATUSES;

    SOCIAL_PARSER.onLoadJobs = function (callback) {
        $(document).ready(function () {
            var positions = $('.results-list li')
                .map(function () {
                    return $(this).position().top;
                }).toArray();

            var i = 0;
            var t = setInterval(function () {
                if (i === 10) {
                    clearInterval(t);
                    return callback();
                }

                $('body').animate({scrollTop: positions[i]}, 100);

                i++;
            }, 200);
        });
    };

    SOCIAL_PARSER.parseJobs = function () {
        var result = {};
        var $el = $('body');

        var _total = $el.find(SELECTORS.TOTAL).html() || '';
        var _profiles;

        _total = stringToNumber.call(_total);
        _profiles = $el.find(SELECTORS.SEARCH_RESULT_PROFILES).map(function () {
            var $li = $(this);
            var $info = $li.find('.search-result__info');

            return {
                //id  : $li.attr('id'),
                link: $info.find('.search-result__result-link').attr('href'),
                name: $info.find('.actor-name').html(),
                job : $info.find('.subline-level-1').html()
            };

        }).toArray();

        result.total = _total;
        result.profiles = _profiles;

        return result;
    };

    SOCIAL_PARSER.onLoadProfile = function (callback) {

        $(document).ready(function () {
            callback();
            /*$('body').animate({scrollTop: $('.profile-detail').height()}, 5000, function () {
             return callback();
             });*/
        });
    };

    SOCIAL_PARSER.parseProfileAsync = function (callback) {
        var $el = $('body');

        async.waterfall([

            // check parse status:
            function(cb) {
                if (!checkParseStatus()) {
                    return cb(new ParseStatusError());
                }

                cb();
            },

            // animate:
            function (cb) {
                $('body').animate({scrollTop: $('.profile-detail').height()}, 5000, function () {
                    return cb();
                });
            },

            // general info:
            function (cb) {
                var _titleArr = $el.find('.pv-top-card-section__headline').html().split(' – ');
                var _summary = parseProfileSummary({$el: $el}) || '';
                var $avatar = $el.find('.pv-top-card-section__photo img');
                var parsed = {
                    link        : window.location.pathname,
                    linkedin_url: window.location.origin + window.location.pathname, // without hash
                    name        : $el.find('.pv-top-card-section__name').html() || '',
                    title       : (_titleArr.length) ? _titleArr[0] : '',
                    country     : $el.find('.pv-top-card-section__location').html() || '',
                    summary     : _summary.trim(),
                    picture     : ($avatar.hasClass('ghost-person') ) ? '' : $avatar.attr('src')
                };

                cb(null, parsed);
            },

            // educations:
            function (parsed, cb) {
                var _educations = $el.find('.pv-education-entity')
                    .map(function () {
                        var $li = $(this);
                        var specializations = $li.find('.pv-entity__comma-item')
                            .map(function () {
                                return $(this).html();
                            })
                            .toArray();

                        return {
                            name       : $li.find('.pv-entity__school-name').html(),
                            program    : specializations.join(', '),
                            description: $li.find('.pv-entity__description').html() || '',
                            start_date : $li.find('.pv-entity__dates time:first').html(),
                            end_date   : $li.find('.pv-entity__dates time:last').html()
                        }
                    })
                    .toArray();

                parsed.education = _educations;
                cb(null, parsed);
            },

            // companies:
            function (parsed, cb) {
                var _options = {
                    $el            : $el,
                    sectionName    : 'companies',
                    sectionSelector: '.experience-section',
                    timeout        : 100
                };

                prepareSection(_options, function() {
                    parsed.companies = parseProfileExperience({$el: $el.find(_options.sectionSelector)}) || [];

                    cb(null, parsed);
                });
            },

            // email:
            function (parsed, cb) {
                var lastCompanyPath = $el.find('.experience-section .pv-position-entity>a').first().attr('href');
                var nameObj = getNameObj();
                var companyId = getIdFromCompanyPath(lastCompanyPath);
                var _options = {
                    firstName: nameObj.first_name,
                    lastName : nameObj.last_name,
                    domain   : parsed.domain,
                    companyId: companyId
                };

                if (!checkParseStatus()) {
                    return cb(new ParseStatusError());
                }

                if (!companyId && !parsed.domain) {
                    console.warn('The email can not be parsed');
                    parsed.email = '';

                    return cb(null, parsed);
                }

                findEmail(_options, function(err, res) {
                    var data;

                    if (err) {
                        return cb(err);
                    }

                    data = (res && res.data) || {};
                    if (data.email) {
                        parsed.email = data.email;
                    }

                    cb(null, parsed);
                });
            },

            // languages:
            function (parsed, cb) {
                var _languages;

                // expand languages container
                $el.find('button[data-control-name="accomplishments_expand_languages"]').click();
                _languages = $el.find('.pv-accomplishments-section .languages li')
                    .map(function () {
                        var $li = $(this);
                        var lang = $li.find('h4').html();
                        var level = $li.find('.pv-accomplishment-entity__proficiency').html() || '';

                        return {
                            language: parseVisuallyHidden(lang),
                            level   : level.trim()
                        };
                    })
                    .toArray();

                parsed.languages = _languages;
                cb(null, parsed);
            },

            // projects:
            function(parsed, cb) {
                var _totalCount = parseSectionCount({$el: $el.find('.pv-accomplishments-section .projects ')});
                var _options= {
                    $el            : $el,
                    sectionName    : 'projects',
                    sectionSelector: '.pv-accomplishments-section .projects li',
                    buttonSelector: '.pv-accomplishments-section .projects button.link',
                    totalCount     : _totalCount
                };

                $el.find('button[data-control-name="accomplishments_expand_projects"]').click();
                prepareSection(_options, function() {
                    parsed.projects = parseProjects({$el: $el});

                    cb(null, parsed);
                });
            },

            // skills:
            function (parsed, cb) {
                var _skills;

                $el.find('button[data-control-name="skill_details"][aria-expanded="false"]').click();
                _skills = $el.find('.pv-skill-entity__skill-name')
                    .map(function () {
                        return $(this).html();
                    })
                    .toArray();

                parsed.skills = _skills;
                cb(null, parsed);
            },

            // certifications:
            function (parsed, cb) {
                var _totalCount = parseSectionCount({$el: $el.find('.pv-accomplishments-section .certifications')});
                var _options= {
                    $el            : $el,
                    sectionName    : 'certifications',
                    sectionSelector: '.pv-accomplishments-section .certifications li',
                    buttonSelector: '.pv-accomplishments-section .certifications button.link',
                    totalCount     : _totalCount
                };

                $el.find('button[data-control-name="accomplishments_expand_certifications"]').click();
                prepareSection(_options, function() {
                    parsed.certifications = parseCertifications({$el: $el});

                    cb(null, parsed);
                });
            },

            // courses:
            function (parsed, cb) {
                var _totalCount = parseSectionCount({$el: $el.find('.pv-accomplishments-section .courses')});
                var _options = {
                    $el            : $el,
                    sectionName    : 'courses',
                    sectionSelector: '.pv-accomplishments-section .courses li',
                    totalCount     : _totalCount
                };

                $el.find('button[data-control-name="accomplishments_expand_courses"]').click();
                prepareSection(_options, function() {
                    var $courses = $el.find('.pv-accomplishments-section .courses');

                    parsed.courses = parseProfileCourses({$el: $courses}) || [];

                    cb(null, parsed);
                });
            }

        ], function (err, parsed) {
            if (err) {
                return callback(err);
            }

            callback(null, parsed);
        });
    };

    SOCIAL_PARSER.parserOnProfileLoaded = function (callback) {
        $(document).ready(callback);
    };

    SOCIAL_PARSER.loadURL = function (url) {
        window.location.href = url;
    };

    SOCIAL_PARSER.testProfilePage = function () {
        var url = window.location.href;

        return PATTERNS.PROFILE_URL.test(url);
    };

    SOCIAL_PARSER.onChangeParseStatus = function(options) {
        var status = options.status;

        console.info('onChangeParseStatus', status);

        _status = status;
    };

    // refresh exported profile:
    function startRefreshProfile() {
        var path = window.location.pathname;

        if (!PATTERNS.PROFILE_URL.test(path)) {
            return console.warn('Invalid path for refresh profile', path);
        }

        SOCIAL_PARSER.onChangeParseStatus({status: PARSE_STATUSES.STARTED});
        SOCIAL_PARSER.parseProfileAsync(function (err, data) {
            if (err) {
                return console.error(err);
            }

            console.log('>>> data', JSON.stringify(data));

            SOCIAL_PARSER.onChangeParseStatus({status: PARSE_STATUSES.STOPPED});
            chrome.runtime.sendMessage({type: CONFIG.REFRESH_PROFILE_MESSAGE, data: data}, function (res) {
                console.log('background response', res);
            });
        });
    }

    // profile hunter:
    function ProfileHunter() {
        var instance = ProfileHunter.instance;

        if (instance !== undefined) {
            this.checkExportedProfile(function(err, isExported) {
                instance.isExportedProfile = isExported;
                instance.renderButton();
            });

            return instance;
        }

        instance = this;
        instance.init();

        ProfileHunter.instance = instance;
        return instance;
    }

    ProfileHunter.prototype = {
        init: function () {
            var self = this;

            this.checkExportedProfile(function(err, isExported) {
                self.isExportedProfile = isExported;
                self.render();
            });
        },

        sendProfile: function (options, callback) {
            var profile = options.profile;
            var data = {
                profile: profile
            };

            chrome.runtime.sendMessage({type: CONFIG.IMPORT_PROFILE_MESSAGE, data: data}, function (res) {
                console.log('>>> response data', res);

                if (res.error) {
                    return callback(res.error);
                }

                callback(null, res);
            });
        },

        onHunterClick: function () {
            var $body = $('body');
            var self = this;

            SOCIAL_PARSER.onChangeParseStatus({status: PARSE_STATUSES.STARTED});

            $body.animate({scrollTop: 0});
            $body.animate({scrollTop: $body.find('.profile-detail').height()}, 5000, function () {
                SOCIAL_PARSER.parseProfileAsync(function (err, data) {
                    if (err) {
                        return self.errorHandler(err);
                    }

                    SOCIAL_PARSER.onChangeParseStatus({status: PARSE_STATUSES.STOPPED});

                    self.sendProfile({profile: data}, function (err, res) {
                        var successMessage;

                        if (err) {
                            return self.errorHandler(err);
                        }

                        successMessage = (res && res.success && res.success.message) || 'The profile was successfully parsed and was exported to server.';
                        self.notification({
                            message: successMessage,
                            type   : 'success'
                        });
                        self.setButtonText(self.calcButtonText({isExported: true}));
                        $body.animate({scrollTop: 0});
                    });
                });
            });
        },

        notification: function (options) {
            var message = options.message || 'Something went wrong!';
            var type = options.type || 'error';
            var color = (type === 'success') ? '#0084bf' : 'red';
            var timeout = options.timeout || 6000;
            var $wrapper = this.$notificationsWrapper;
            var $p = $('<p>' + message + '</p>');

            $p.css({
                'text-align': 'center',
                color       : color
            });

            $wrapper.css({
                'border-bottom': '5px solid ' + color,
                display        : 'block'
            })
                .html($p);

            setTimeout(function () {
                $wrapper.css({display: 'none'});
            }, timeout);
        },

        errorHandler: function (xhr) {
            var message;

            if (xhr.responseJSON && xhr.responseJSON.errors) {
                message = (xhr.responseJSON.errors);
            } else if (xhr.responseText) {
                message = xhr.responseText;
            } else {
                message = xhr;
            }

            this.notification({message: message});
        },

        calcButtonText: function(options) {
            if (options.isExported) {
                return 'Exported';
            }

            return 'Go Experts';
        },

        setButtonText: function(text) {
            this.$btn.find('.btnText').html(text);
        },

        checkExportedProfile: function(callback) {
            var data = {
                link: window.location.pathname
            };

            chrome.runtime.sendMessage({type: CONFIG.GET_PROFILE_MESSAGE, data: data}, function (res) {
                res = res || {};

                var isExported;

                if (res.profile && res.profile.is_exported) {
                    isExported = true;
                } else {
                    console.warn(res.error);
                    isExported = false;
                }

                callback(null, isExported);
            });
        },

        renderNotifications: function () {
            this.$notificationsWrapper = $('<div id="euexNotificationWrapper"></div>');
            this.$notificationsWrapper.css({
                position  : 'fixed',
                top       : 0,
                width     : '100%',
                background: '#fff',
                //'border-bottom': '5px solid red',
                padding   : '30px',
                'z-index' : 100,
                'display' : 'none'
            });

            $('body').append(this.$notificationsWrapper);
        },

        renderButton: function () {
            var $actions = $('.pv-top-card-section__actions');
            var $span;
            var btnText = this.calcButtonText({isExported: this.isExportedProfile});

            if ($actions.find('.hunterBtnWrp').length) {
                this.$btn = $actions.find('.hunterBtnWrp');
                this.$btn.off('click');
                this.$btn.on('click', $.proxy(this.onHunterClick, this)); // on click
                this.setButtonText(btnText);

                return;
            }

            this.$btn = $([
                '<button class="primary top-card-action hunterBtnWrp" style="background: #F1C40F;margin-left: 12px;">',
                '<span class="btnText hunterBtn">' + btnText + '</span>',
                '</button>'
            ].join(' '));
            this.$btn.on('click', $.proxy(this.onHunterClick, this));     // on click

            if ($actions.find('.primary.message').length) {
                $span = $('<span data-control-name="euex-message" class="inline-block"></span>');
                $span.html(this.$btn);
                $actions.append($span);
            } else {
                $actions.append(this.$btn);
            }
        },

        render: function () {
            this.renderButton();
            this.renderNotifications();
        }
    };

    $(document).ready(function () {
        var _path;
        var hunter;

        if (window.location.href.indexOf(REFRESH_PROFILE_ACTION) !== -1) {
            startRefreshProfile();
        }

        setInterval(function () {
            var pathname = window.location.pathname;

            if (pathname !== _path) {
                _path = pathname;
                // console.log('>>> changed path', _path);

                if (PATTERNS.PROFILE_URL.test(_path)) {
                    hunter = new ProfileHunter();
                }
            }

        }, 200);
    });
})();

/*SOCIAL_PARSER.onLoadProfile(function (err) {
 if (err) {
 return console.error(err);
 }

 SOCIAL_PARSER.onChangeParseStatus({status: SOCIAL_PARSER.PARSE_STATUSES.STARTED});
 SOCIAL_PARSER.parseProfileAsync(function(err, data) {
 SOCIAL_PARSER.onChangeParseStatus({status: SOCIAL_PARSER.PARSE_STATUSES.STOPPED});

 if (err) {
 return console.error(err);
 }

 console.log('>>> data', data);
 console.log('>>> data', JSON.stringify(data));
 });
 });*/

/*SOCIAL_PARSER.onLoadJobs(function() {
 var data = SOCIAL_PARSER.parseJobs();

 console.log('>>> data', data);
 });*/
