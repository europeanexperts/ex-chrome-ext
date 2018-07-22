(function () {
    'use strict';

    var compiledTemplates = {};
    var $el = $('#templates');

    var _TEMPLATES = {
        getTemplate: function(templateId) {
            var $template;

            if (!compiledTemplates[templateId]) {
                $template = $el.find('#' + templateId + '-template');
                compiledTemplates[templateId] = _.template($template.html());
            }

            return compiledTemplates[templateId];
        }
    };

    window.APP_TEMPLATES = window.APP_TEMPLATES || _TEMPLATES;
})();