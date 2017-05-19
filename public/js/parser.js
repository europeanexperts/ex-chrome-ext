window.SOCIAL_PARSER = window.SOCIAL_PARSER || {};

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
    }

})();


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