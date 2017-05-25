window.SOCIAL_PARSER = window.SOCIAL_PARSER || {};

(function () {
    'use strict';

    var SELECTORS = {
        TOTAL                 : '.search-results__total',
        SEARCH_RESULT         : '.results-list',
        SEARCH_RESULT_PROFILES: '.results-list li'
    };

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
        var delimiter = (options && options.delimiter) || ' – ';

        return str.split(delimiter).map(function(item) {
            return item.trim();
        });
    }

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

        var _total = $el.find(SELECTORS.TOTAL).html();

        _total = _total.replace(/[a-zA-Z\s.]/g, '');
        _total = _total.replace(/,/g, '.');

        var _profiles = $el.find(SELECTORS.SEARCH_RESULT_PROFILES).map(function () {
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
            $('body').animate({scrollTop: $('.profile-detail').height()}, 3000, function () {
                return callback();
            });
        });
    };

    SOCIAL_PARSER.parseProfile = function () {
        var $el = $('body');
        var _titleArr = $el.find('.pv-top-card-section__headline').html().split(' – ');
        var _title = (_titleArr.length) ? _titleArr[0] : '';
        var _languages;
        var _projects;

        // expand languages container
        $el.find('button[data-control-name="accomplishments_expand_languages"]').click();
        _languages =  $el.find('.pv-accomplishments-section .languages li')
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

        $el.find('button[data-control-name="accomplishments_expand_projects"]').click();
        _projects =  $el.find('.pv-accomplishments-section .projects li')
            .map(function () {
                var $li = $(this);
                var prTitle = $li.find('h4').html();
                var prDescription = $li.find('.pv-accomplishment-entity__description').html();
                var dateRange = parseEntityRange($el.find('.pv-accomplishment-entity__date').html());

                return {
                    title      : parseVisuallyHidden(prTitle),
                    description: parseVisuallyHidden(prDescription),
                    start_date : dateRange[0],
                    end_date   : dateRange[1]
                };
            })
            .toArray();

        return {
            name     : $el.find('.pv-top-card-section__name').html() || '',
            title    : _title || '',
            country  : $el.find('.pv-top-card-section__location').html() || '',
            summary  : $el.find('.pv-top-card-section__summary .truncate-multiline--last-line-wrapper span').html() || '',
            picture  : $el.find('.pv-top-card-section__photo img').attr('src'),
            languages: _languages,
            projects: _projects,
            education: $el.find('.pv-education-entity')
                .map(function () {
                    var $li = $(this);

                    return {
                        name       : $li.find('.pv-entity__school-name').html(),
                        description: $li.find('.pv-entity__comma-item')
                            .map(function () {
                                return $(this).html();
                            })
                            .toArray()
                            .join(', '),
                        start_date : $li.find('.pv-entity__dates time:first').html(),
                        end_date   : $li.find('.pv-entity__dates time:last').html()
                    }
                })
                .toArray(),
            skills: $el.find('.pv-skill-entity__skill-name')
                .map(function () {
                    return $(this).html();
                })
                .toArray(),

            companies: $el.find('.pv-position-entity')
                .map(function () {
                    var $li = $(this);

                    return {
                        title      : $li.find('h3').html(),
                        company    : $li.find('.pv-entity__secondary-title').html(),
                        location   : '', // TODO
                        start_date : $li.find('.pv-entity__date-range span:last').html().split(' – ')[0],
                        end_date   : $li.find('.pv-entity__date-range span:last').html().split(' – ')[1],
                        description: '' // // TODO
                    }
                })
                .toArray()
        };
    };

    SOCIAL_PARSER.parserOnProfileLoaded = function (callback) {
        $(document).ready(callback);
    };

    SOCIAL_PARSER.loadURL = function (url) {
        window.location.href = url;
    };
})();

/*SOCIAL_PARSER.onLoadProfile(function (err) {
    var data;

    if (err) {
        return console.error(err);
    }

    data = SOCIAL_PARSER.parseProfile();
    console.log('>>> data', data);
    console.log('>>> data', JSON.stringify(data));
});*/

/*SOCIAL_PARSER.onLoadJobs(function() {
 var data = SOCIAL_PARSER.parseJobs();

 console.log('>>> data', data);
 });*/

