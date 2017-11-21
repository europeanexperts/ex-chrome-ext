(function () {
    'use strict';

    var REQUIRED_FIELD = 'Required field';
    var $form = $('#appSettingsForm');

    function init() {
        var data;
        var str = localStorage.getItem('APP_CONFIG');

        try {
            data = JSON.parse(str);
        } catch(e) {
            data = {}
        }

        deserialize(data);
    }

    function deserialize(conf) {
        if (conf && conf.app_env) {
            $form.find('input[name="app_env"][value="' + conf.app_env + '"]').prop('checked', true);
        }
    }

    function serialize() {
        return {
            app_env: $form.find('input[name="app_env"]:checked').val()
        }
    }

    function validate(data) {
        var errors = {};

        data = data || serialize();
        if (!data.app_env) {
            errors.app_env = REQUIRED_FIELD;
            $form.find('input[name="app_env"]').closest('.input-field').find('.field-error').removeClass('hide').html(REQUIRED_FIELD);
        } else {
            $form.find('input[name="app_env"]').closest('.input-field').find('.field-error').remove('hide').html('');
        }

        return errors;
    }

    function onSubmit(e) {
        var data = serialize();
        var errors = validate(data);

        if (Object.keys(errors).length) {
            return false;
        }

        e.stopPropagation();
        e.preventDefault();

        localStorage.setItem('APP_CONFIG', JSON.stringify(data));
    }

    $form.on('submit', onSubmit);
    $form.find('.saveSettingsBtn').on('click', onSubmit);

    init();
})();
