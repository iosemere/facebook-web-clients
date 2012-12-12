(function () {

    function RepeatablePromise() {
        this.callbacks = [];
    }

    RepeatablePromise.prototype.invalidate = function () {
        this.args = undefined;
    };

    RepeatablePromise.prototype.resolve = function () {
        this.args = Array.prototype.slice.apply(arguments);
        console.log(this.args);
        var i, numCallbacks = this.callbacks.length;
        for (i = 0; i < numCallbacks; i++) {
            this.callbacks[i].apply(null, this.args);
        }
    };

    RepeatablePromise.prototype.then = function (fn) {
        this.callbacks.push(fn);
        if (this.args !== undefined) {
            fn.apply(null, this.args);
        }
    };

    var permissions = {scope: 'email,publish_actions,publish_stream'};

    /**
     * Provides a means for client scripts to access the Facebook API and authenticate users.
     * @constructor
     */
    function Authorizer() {
        this.authDeferred = new RepeatablePromise();
        this.scriptLoadDeferred = new RepeatablePromise();
        this.userDataDeferred = new RepeatablePromise();
    }

    Authorizer.prototype = Object.create(EventEmitter.prototype);

    /**
     * An access token used to authenticate the user's Facebook session. Note that at present
     * the authenticator does not handle access tokens expiring.
     * @see https://developers.facebook.com/docs/howtos/login/debugging-access-tokens/
     * @type {String}
     */
    Authorizer.accessToken = null;

    /**
     * The user's id which can be used to retrieve further data from the Facebook open graph
     * For instance you could call the following URL: https://graph.facebook.com/{userId}
     * @type {String}
     */
    Authorizer.userId = null;

    /**
     * The Facebook user data object. Includes propertiers for the user's id, name, first_name, last_name, username, gender and locale.
     * You can get the user's profile picture by substituting the username into the following call to the Graph API
     * http://graph.facebook.com/" + userData.username + "/picture
     * @see http://graph.facebook.com/btaylor
     * @type {Object}
     */
    Authorizer.userData = null;

    /**
     * Gets the user to login. This may generate a popup dialog prompting the user for their username and password.
     * To prevent popup blockers from supressing the dialog this call must be made as a direct result of a user action
     * and within the same execution scope (ie not resulting from a callback). Client methods can also subscribe to the
     * following events fired during the login process (see _handleGotLoginStatus)
     *
     * @see https://developers.facebook.com/docs/reference/javascript/FB.login/
     * @return A promise which is resolved once the user has been authenticated and authorized the Guardian app
     */
    Authorizer.prototype.login = function () {
        if (!this.accessToken) {
            this._loadFacebookAPI().then(function (FB) {
                FB.login(this._handleGotLoginStatus.bind(this), permissions);
            }.bind(this))
        }
        return this.authDeferred;
    };

    /**
     * Checks whether the user is logged in and has authorised the app. Returns a promise which is resolved
     * when the user is full connected and authenticated for the app.Client methods can also subscribe to the
     * following events fired during the login process (see _handleGotLoginStatus)
     *
     * @see https://developers.facebook.com/docs/reference/javascript/FB.getLoginStatus/
     * @return A promise which is resolved when the user has been authenticated and authorized the Guardian app
     */
    Authorizer.prototype.getLoginStatus = function () {
        this._loadFacebookAPI().then(function (FB) {
            FB.getLoginStatus(this._handleGotLoginStatus.bind(this), permissions);
        }.bind(this));
        return this.authDeferred;
    };

    /**
     * Returns a promise providing access to the user data.
     * @return {*}
     */
    Authorizer.prototype.whenGotUserData = function () {
        return this.userDataDeferred;
    };

    /* End of public methods */

    var scriptId = 'facebook-jssdk';

    /**
     * Called when the user logs in or checks login status. If the user is fully auth'd to use the app, then
     * it will resolve the authorized promise. It will also trigger one of the following events
     *
     * Authorizer.AUTHORIZED: Triggered when the user is not signed into their account
     * Authorizer.NOT_LOGGED_IN: Triggered when the user is not signed into their account
     * Authorizer.NOT_AUTHORIZED: Triggered when the user signed into their account but has not authorised the app
     *
     * If the user is logged in, the Authorizer will also fetch user data (see _handleGotUserData)
     *
     * @param response The response from facebook following a call to getLoginStatus or getLogin.
     * @private
     */
    Authorizer.prototype._handleGotLoginStatus = function (response) {
        switch (response.status) {
            case 'connected':
                this.accessToken = response.authResponse.accessToken;
                this.userId = response.authResponse.userID;
                this.trigger(Authorizer.AUTHORIZED);
                this._getUserData();
                this.authDeferred.resolve(FB);
                break;
            case 'not_authorized':
                this._getUserData();
                this.trigger(Authorizer.NOT_AUTHORIZED);
                break;
            default:
                this.trigger(Authorizer.NOT_LOGGED_IN);
        }

    };

    /**
     * Fetches data about the user. When this is complete it triggers the following:
     * Authorizer.GOT_USER_DETAILS: Which includes a single parameter with the userData JSON
     * This data is also made available as a field on the authorizer.
     */
    Authorizer.prototype._getUserData = function () {
        FB.api("/me", this._handleGotUserData.bind(this));
    };

    /**
     * Called when the Facebook API returns data about the user
     * @param {Object} data The data from the server
     * @private
     */
    Authorizer.prototype._handleGotUserData = function (data) {
        if (data && !data.error) {
            this.userData = data;
            this.userDataDeferred.resolve(this.userData);
            this.trigger(Authorizer.GOT_USER_DETAILS, [data]);
        }
    };

    /**
     * Gets the Facebook APP id for the relevent guardian app. It will first check
     * window.identity.facebook.appId.
     *
     * If this is not present, then it will extract the from the fb:app_id meta tag on the page.
     * Note that the meta tag always displays the production app id, so is not correct in preproduction environments.
     *
     * @private
     */
    Authorizer.prototype.getAppId = function () {
        var identityId = window.identity && identity.facebook && identity.facebook.appId,
            metaTag = document.querySelector && document.querySelector("meta[property='fb:app_id']");
        return identityId || metaTag && metaTag.content;
    };

    /**
     * @private
     */
    Authorizer.prototype._handleScriptLoaded = function () {

        FB.init({
            appId: this.getAppId(),
            channelUrl: '//' + document.location.host + ':' + document.location.port + '/channel.html',
            status: true, // check login status
            cookie: true, // enable cookies to allow the server to access the session
            xfbml: true  // parse XFBML
        });

        this.scriptLoadDeferred.resolve(FB);

    };

    /**
     * Loads the Facebook script using RequireJS or Curl JS
     * @private
     */
    Authorizer.prototype._loadFacebookScript = function () {
        var scriptLoader = require || curl;
        scriptLoader(['//connect.facebook.net/en_US/all.js'], this._handleScriptLoaded.bind(this))
    };

    /**
     * Loads the Facebook API. Not intended for direct use: call the function you intend to use (login or getloginstatus)
     * and these will load the facebook api or use the existing version as required.
     * @private
     */
    Authorizer.prototype._loadFacebookAPI = function () {
        if (window.FB) {
            this.scriptLoadDeferred.resolve(window.FB);
        } else if (!document.getElementById(scriptId) && !this._requiredAlready) {
            this._requiredAlready = true;
            this._loadFacebookScript();
        }
        return this.scriptLoadDeferred;
    };

    /**
     * Removes all events from the authorizer
     */
    Authorizer.prototype.destroy = function () {
        this.removeEvent(); // removes all events
    };

    /** @event */
    Authorizer.GOT_USER_DETAILS = "gotUserDetails";

    /** @event */
    Authorizer.NOT_LOGGED_IN = "notLoggedIn";

    /** @event */
    Authorizer.NOT_AUTHORIZED = "notAuthorized";

    /** @event */
    Authorizer.AUTHORIZED = "connected";

    guardian.facebook.Authorizer = Authorizer;

})();

