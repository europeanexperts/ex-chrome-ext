window.SOCIAL_PARSER = window.SOCIAL_PARSER || {};

/*
*
* */
(function () {
    var SELECTORS = {
        TOTAL                 : '.search-results__total',
        SEARCH_RESULT         : '.results-list',
        SEARCH_RESULT_PROFILES: '.results-list li'
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

    SOCIAL_PARSER.onLoadProfile = function(callback) {

        $(document).ready(function() {
            var timeout = 20; // 10 sec
            var currentTime = new Date();
            var maxTime = currentTime.setSeconds(currentTime.getSeconds() + timeout);

            $('html, body').animate({scrollTop: $('#profile-wrapper').height()});

            var intervalId = setInterval(function() {
                var $langEl = $('#ember2098');
                var $skillsEl = $('#ember2096');
                var now = new Date();

                console.log('>>> check interval');

                if ($langEl.html() && $langEl.html() !== '<!---->'
                    && $skillsEl.html() && $skillsEl.html() !== '<!---->' && !$skillsEl.hasClass('pv-deferred-area--pending')) {
                    console.log('>>> clear interval html', intervalId);
                    clearInterval(intervalId);
                    callback();
                } else if (now > maxTime) {
                    console.log('>>> clear interval timeout', intervalId);
                    clearInterval(intervalId);
                    callback({'message': 'Timeout error'});
                }

            }, 100);
        });
    };

    SOCIAL_PARSER.parseProfile = function () {
        var $el = $('body');
        var _titleArr = $el.find('.pv-top-card-section__headline').html().split(' – ');
        var _title = (_titleArr.length) ? _titleArr[0] : '';

        return {
            name     : $el.find('.pv-top-card-section__name').html(),
            title    : _title,
            country  : $el.find('.pv-top-card-section__location').html(),
            summary  : '', // TODO
            picture  : $el.find('.pv-top-card-section__photo img').attr('src'),
            education: $el.find('.pv-education-entity').map(function () {
                var $li = $(this);

                return {
                    name: $li.find('.pv-entity__school-name').html(),
                    description: $li.find('.pv-entity__comma-item')
                        .map(function() {return $(this).html();})
                        .toArray()
                        .join(', '),
                    start_date : $li.find('.pv-education-entity__date time:first').html(),
                    end_date : $li.find('.pv-education-entity__date time:last').html()
                }
                })
                .toArray(),

            languages: $el.find('.pv-accomplishments-section .languages li')
                .map(function() {return $(this).html()})
                .toArray(),

            skills: $el.find('.pv-skill-entity__skill-name')
                .map(function() {return $(this).html();})
                .toArray(),

            companies: $el.find('.pv-position-entity')
                .map(function() {
                    var $li = $(this);

                    return {
                        title: $li.find('h3').html(),
                        company: $li.find('.pv-entity__secondary-title').html(),
                        location: '', // TODO
                        start_date: $li.find('.pv-entity__date-range span:last').html().split(' – ')[0],
                        end_date: $li.find('.pv-entity__date-range span:last').html().split(' – ')[1],
                        description: '' // // TODO
                    }
                })
                .toArray()
        };
    };

    SOCIAL_PARSER.parserOnProfileLoaded = function(callback) {
        $(document).ready(callback);
    }
})();

SOCIAL_PARSER.onLoadProfile(function(err) {
    if (err) {
        return console.error(err);
    }

    var data = SOCIAL_PARSER.parseProfile();
    console.log('>>> data', data);
});

/*

 {

 job_id 1495180474989


 "total":"5",
 "profiles":[
 {
 "link":"/in/synov/",
 "name":"Nikita Synov",
 "job":"Taking Care of Your Business with Innovative Marketing Strategies"
 },
 {
 "link":"#",
 "name":"LinkedIn Member",
 "job":"Program Development Professional"
 },
 {
 "link":"/in/victoroleksuh/",
 "name":"Victor Oleksuh",
 "job":"Looking for Junior PHP/WordPress developer position"
 },
 {
 "link":"#",
 "name":"LinkedIn Member",
 "job":"System administrator - Ergopack LLC"
 },
 {
 "link":"/in/%D1%81%D0%B2%D0%B5%D1%82%D0%BB%D0%B0%D0%BD%D0%B0-%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D0%BD%D0%BA%D0%BE-46418876/",
 "name":"Светлана Protsenko",
 "job":"Senior Marketing Manager  Pilog Internftionfl Group, CIS\n"
 }
 ]
 }

 */