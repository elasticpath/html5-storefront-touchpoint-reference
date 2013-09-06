/**
 * Copyright © 2013 Elastic Path Software Inc. All rights reserved.

 * User: sbrookes
 * Date: 22/08/13
 * Time: 4:10 PM
 *
 */
define(
  function (require) {
    var ep = require('ep');
    var $ = require('jquery');
    var EventBus = require('eventbus');
    var templates = require('text!modules/auth/auth.templates.html');
    var authController = require('modules/auth/auth.controller');
    var authView = require('modules/auth/auth.views');
    var authModel = require('modules/auth/auth.models');

    describe('UI Storefront Auth Module', function () {

      before(function () {
        this.$fixture = $('<div data-region="authMenuItemRegion"></div>');
      });

      beforeEach(function () {
        this.$fixture.empty().appendTo($("#Fixtures"));
        this.$fixture.append(templates);
        this.authMenuItemRegion = new Marionette.Region({
          el: '[data-region="authMenuItemRegion"]'
        });

        this.view = new authView.DefaultView({
          model: new authModel.LoginFormModel()
        });
        this.authMenuItemRegion.show(this.view);

      });

      afterEach(function () {
        this.view.model.destroy();
      });

      after(function () {
        $("#Fixtures").empty();
      });


      describe("Auth Views",function(){
        it("DefaultView should exist", function () {
          expect(authView.DefaultView).to.exist;
        });
        it("LoginFormView should exist", function () {
          expect(authView.LoginFormView).to.exist;
        });
        it("ProfileMenuView should exist", function () {
          expect(authView.ProfileMenuView).to.exist;
        });
        it("getLoginRequestModel should exist", function () {
          expect(authView.getLoginRequestModel).to.exist;
        });
        it("Login Button and hidden menu container should exist", function () {
          expect($('.btn-auth-dropdown').html()).to.exist;
          expect($('.auth-nav-container').html()).to.exist;
        });
        it("Login Button click should fire auth.btnAuthMenuDropdownClicked", function (done) {
          EventBus.on('auth.btnAuthMenuDropdownClicked', function () {
            done();
          });
          $('button.btn-auth-dropdown').trigger('click');
        });

        it("ep.app.mainAuthRegion should exist", function () {
          expect(ep.app.mainAuthView).to.exist;
        });
        it("auth.btnAuthMenuDropdownClicked event with PUBLIC state should trigger loadRegionContentRequest with LoginFormView ", function (done) {
          var state = 'PUBLIC';
          EventBus.on('layout.loadRegionContentRequest', function (obj) {
            if (obj.view === 'LoginFormView') {
              done();
            }
          });
          EventBus.trigger('auth.loadAuthMenuRequest', state);
        });
        it("auth.btnAuthMenuDropdownClicked event with REGISTERED state should trigger loadRegionContentRequest with ProfileMenuView ", function (done) {
          var state = 'REGISTERED';
          EventBus.on('layout.loadRegionContentRequest', function (obj) {
            if (obj.view === 'ProfileMenuView') {
              done();
            }
          });
          EventBus.trigger('auth.loadAuthMenuRequest', state);
        });
      });

    });

    describe('Auth Module - Models', function () {
      it("LogoutModel should exist", function () {
        expect(authModel.LogoutModel).to.exist;
      });
      it("LoginFormModel should exist", function () {
        expect(authModel.LoginFormModel).to.exist;
      });
      it("LoginModel should exist", function () {
        expect(authModel.LoginModel).to.exist;
      });

    });



  }
);
