/* Facebook Web Clients 1.0 */

(function () {

    var baseURI = window.baseURI || "http://facebook-web-clients.appspot.com",
        apiURI = window.baseAPI || "http://gu-facebook-actions.appspot.com",
        cssFile = baseURI + "/static/facebook-components-vote-1.0.css";

    (document.createStyleSheet) ? document.createStyleSheet(cssFile) : jQuery('<link rel="stylesheet" type="text/css" href="' + cssFile + '" />').appendTo('head');

    var script;
    if (jQuery.browser.msie && jQuery.browser.version < 9) {
        script = "/static/facebook-components-vote-ie-1.0.js";
    } else {
        script = "/static/facebook-components-vote-1.0.js"
    }

    require([
        baseURI + "/static/facebook-authorizer-1.0.js",
        baseURI + "/static/facebook-ui-donut-1.0.js",
        baseURI + script
    ], function () {

        var MICROAPPS = [
            {
                selector: ".ma-placeholder-facebook-agree-disagree-with-opinion-component",
                type: guardian.facebook.VoteModel.AGREE_WITH_OPINION
            },
            {
                selector: ".ma-placeholder-facebook-agree-disagree-with-headline-component",
                type: guardian.facebook.VoteModel.AGREE_WITH_HEADLINE
            },
            {
                selector: ".ma-placeholder-facebook-think-headline-likely-unlikely-component",
                type: guardian.facebook.VoteModel.THINK_LIKELY
            }
        ];

        function getMicroAppDefinition() {
            for (var i = 0, l = MICROAPPS.length; i < l; i++) {
                if (jQuery(MICROAPPS[i].selector).length) {
                    return MICROAPPS[i];
                }
            }
            throw new Error("No suitable component found on page for Facebook component")
        }

        var
            microapp = getMicroAppDefinition(),
            authorizer = guardian.facebook.Authorizer.getInstance(),
            model = new guardian.facebook.VoteModel(microapp.type),
            view = new guardian.facebook.VoteComponent(
                microapp.selector,
                model,
                guardian.ui.CanvasDonut,
                guardian.facebook.BigNumberFormatter);

        new guardian.facebook.LoginButtonView(".vote-component .social-summary", authorizer, model);
        new guardian.facebook.TitleView(".vote-component .vote-title", model);

        controller = new guardian.facebook.VoteController(model, view, authorizer);

        controller.initialise(apiURI);

    });
})();