/**
 * Copyright © 2014 Elastic Path Software Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * Functional Storefront Unit Test - Checkout Controller
 */
define(function (require) {
  var ep = require('ep');
  var EventBus = require('eventbus');
  var EventTestHelpers = require('testhelpers.event');
  var dataJSON = require('text!../../../../tests/data/checkout.json');

  var controller = require('checkout');
  var view = require('checkout.views');
  var checkoutTemplates = require('text!modules/base/checkout/base.checkout.templates.html');
  var addressTemplate = require('text!modules/base/components/address/base.component.address.template.html');
  var paymentTemplate = require('text!modules/base/components/payment/base.component.payment.template.html');

  describe("Checkout Default Controller", function () {
    describe("Given all information available", function() {
      before(function (done) {
        // Append templates to the DOM
        $("#Fixtures").append(checkoutTemplates, addressTemplate, paymentTemplate);

        var parsedJSONData = JSON.parse(_.clone(dataJSON));
        this.parsedResponse = parsedJSONData.response;

        this.server = getFakeCheckoutServer(parsedJSONData.zoom, this.parsedResponse);

        this.view = new controller.DefaultController();
        this.view.render();

        // Notify Mocha that the 'before' hook is complete when the checkout order region is shown
        this.view.checkoutOrderRegion.on('show', function() {
          done();
        });
      });

      after(function () {
        $("#Fixtures").empty();
        ep.io.localStore.removeItem(ep.app.config.cortexApi.scope + '_oAuthToken');
        ep.io.sessionStore.removeItem('orderLink');
        delete(this.parsedResponse);
        this.server.restore();
      });

      it('returns an instance of cart View.DefaultLayout', function () {
        expect(this.view).to.be.an.instanceOf(view.DefaultLayout);
      });

      it('view\'s DOM is rendered (view content rendered)', function () {
        expect(this.view.el.childElementCount).to.be.equal(1);
      });

      it('the TaxesCollectionView is rendered', function() {
        // Test for the presence of the unordered list rendered by TaxesCollectionView
        expect(this.view.$el.find('ul.checkout-tax-list')).to.have.length(1);
      });

      it('renders the tax total', function() {
        expect($('[data-el-value="checkout.taxTotal"]', this.view.$el).text())
          .to.be.equal(this.parsedResponse._tax[0].total.display);
      });

      it('renders the BillingAddressesCompositeView view', function() {
        // There are billing addresses in the fake JSON response, so this region should be rendered
        expect(this.view.$el.find('[data-region="billingAddressSelectorsRegion"]')).to.have.length(1);
      });

      it('renders the ShippingAddressesCompositeView view', function() {
        // There are shipping addresses in the fake JSON response, so this region should be rendered
        expect(this.view.$el.find('[data-region="shippingAddressSelectorsRegion"]')).to.have.length(1);
      });

      it('renders the ShippingOptionsCompositeView view', function() {
        // There are shipping options in the fake JSON response, so this region should be rendered
        expect(this.view.$el.find('[data-region="shippingOptionSelectorsRegion"]')).to.have.length(1);
      });

      it('renders the PaymentMethodsCompositeView view', function() {
        // There are payment methods in the fake JSON response, so this region should be rendered
        expect(this.view.$el.find('[data-region="paymentMethodSelectorsRegion"]')).to.have.length(1);
      });
    });

    describe("Given there is no tax data, billing addresses or shipping addresses/options or payment method", function() {
      // Fake a server response with missing data
      before(function (done) {
        $("#Fixtures").append(checkoutTemplates, addressTemplate, paymentTemplate);

        var parsedJSONData = JSON.parse(_.clone(dataJSON));
        var parsedFakeResponse = parsedJSONData.response;

        // Remove tax, billing address, shipping address and shipping option data in the fake response JSON
        parsedFakeResponse._tax = [];
        parsedFakeResponse._billingaddressinfo = [];
        parsedFakeResponse._deliveries[0]._element[0]._destinationinfo = [];
        parsedFakeResponse._deliveries[0]._element[0]._shippingoptioninfo = [];

        this.server = getFakeCheckoutServer(parsedJSONData.zoom, parsedFakeResponse);

        this.view = new controller.DefaultController();
        this.view.render();

        // Notify Mocha that the 'before' hook is complete when the checkout order region is shown
        this.view.checkoutOrderRegion.on('show', function() {
          done();
        });
      });

      after(function () {
        $("#Fixtures").empty();
        ep.io.localStore.removeItem(ep.app.config.cortexApi.scope + '_oAuthToken');
        ep.io.sessionStore.removeItem('orderLink');
        this.server.restore();
      });

      it('does not render the TaxesCollectionView view', function() {
        expect(this.view.$el.find('ul.checkout-tax-list')).to.have.length(0);
      });

      it('renders the billingAddressesEmptyView view', function() {
        expect(this.view.$el.find('[data-el-value="checkout.noBillingAddressesMsg"]')).to.have.length(1);
      });

      it('renders the shippingAddressesEmptyView view', function() {
        expect(this.view.$el.find('[data-el-value="checkout.noShippingAddressesMsg"]')).to.have.length(1);
      });

      // If there are no shipping addresses, then we should not display the 'no shipping addresses' message
      it('does not render the shippingOptionsEmptyView view', function() {
        expect(this.view.$el.find('[data-el-value="checkout.noShippingOptionsMsg"]')).to.have.length(0);
      });

    });

    describe("Given no default chosen (no chosen billing / shipping address, shipping option, payment option)", function() {

      // Fake a server response without chosen address and shipping entities
      before(function (done) {
        $("#Fixtures").append(checkoutTemplates, addressTemplate, paymentTemplate);

        sinon.spy(EventBus, 'trigger');
        sinon.stub(ep.io, 'ajax');

        EventTestHelpers.unbind('checkout.updateChosenBillingAddressRequest');
        EventTestHelpers.unbind('checkout.updateChosenShippingAddressRequest');
        EventTestHelpers.unbind('checkout.updateChosenShippingOptionRequest');
        EventTestHelpers.unbind('checkout.updateChosenPaymentMethodRequest');

        var parsedJSONData = JSON.parse(_.clone(dataJSON));
        var parsedFakeResponse = parsedJSONData.response;

        // Remove any chosen attributes from the test data
        delete(parsedFakeResponse._billingaddressinfo[0]._selector[0]._chosen);
        delete(parsedFakeResponse._deliveries[0]._element[0]._destinationinfo[0]._selector[0]._chosen);
        delete(parsedFakeResponse._deliveries[0]._element[0]._shippingoptioninfo[0]._selector[0]._chosen);
        delete(parsedFakeResponse._paymentmethodinfo[0]._paymentmethod[0]);

        this.parsedFakeResponse = parsedFakeResponse;

        this.server = getFakeCheckoutServer(parsedJSONData.zoom, parsedFakeResponse);

        this.view = new controller.DefaultController();
        this.view.render();

        // Notify Mocha that the 'before' hook is complete when the checkout order region is shown
        this.view.checkoutOrderRegion.on('show', function() {
          done();
        });

      });

      after(function () {
        $("#Fixtures").empty();
        EventBus.trigger.restore();
        ep.io.ajax.restore();
        this.server.restore();

        EventTestHelpers.reset();

        ep.io.localStore.removeItem(ep.app.config.cortexApi.scope + '_oAuthToken');
        ep.io.sessionStore.removeItem('orderLink');
        delete(this.parsedFakeResponse);
      });

      it('triggers event to set a chosen billing address', function() {
        var firstChoiceBillingAddress = jsonPath(this.parsedFakeResponse, '$.._billingaddressinfo[0].._choice')[0][0];
        var firstChoiceBillingAddressSelectAction =
          jsonPath(firstChoiceBillingAddress, '$..links[?(@.rel=="selectaction")].href')[0];

        // Expect the event to be triggered with the selectAction of the first choice billing address
        expect(EventBus.trigger).to.be.calledWith(
          'checkout.updateChosenBillingAddressRequest',
          firstChoiceBillingAddressSelectAction
        );
      });

      it('triggers event to set a chosen shipping address', function() {
        var firstChoiceShippingAddress = jsonPath(this.parsedFakeResponse, '$.._deliveries[0].._choice')[0][0];
        var firstChoiceShippingAddressSelectAction =
          jsonPath(firstChoiceShippingAddress, '$..links[?(@.rel=="selectaction")].href')[0];

        // Expect the event to be triggered with the selectAction of the first choice shipping address
        expect(EventBus.trigger).to.be.calledWith(
          'checkout.updateChosenShippingAddressRequest',
          firstChoiceShippingAddressSelectAction
        );
      });

      it('triggers event to set a chosen shipping option', function() {
        var firstChoiceShippingOption = jsonPath(this.parsedFakeResponse, '$.._shippingoptioninfo[0].._choice')[0][0];
        var firstChoiceShippingOptionSelectAction =
          jsonPath(firstChoiceShippingOption, '$..links[?(@.rel=="selectaction")].href')[0];

        // Expect the event to be triggered with the selectAction of the first choice shipping option
        expect(EventBus.trigger).to.be.calledWith(
          'checkout.updateChosenShippingOptionRequest',
          firstChoiceShippingOptionSelectAction
        );
      });

      it('triggers event to set a chosen payment method', function() {
        var firstChoicePaymentMethod = jsonPath(this.parsedFakeResponse, '$.._paymentmethodinfo[0].._choice')[0][0];
        var firstChoicePaymentMethodSelectAction =
          jsonPath(firstChoicePaymentMethod, '$..links[?(@.rel=="selectaction")].href')[0];

        // Expect the event to be triggered with the selectAction of the first choice shipping option
        expect(EventBus.trigger).to.be.calledWith(
          'checkout.updateChosenPaymentMethodRequest',
          firstChoicePaymentMethodSelectAction
        );
      });

    });

    describe("Given there are no physical items requiring shipment in the cart", function() {
      // Fake a server response without a deliveryType of "SHIPMENT"
      before(function (done) {
        $("#Fixtures").append(checkoutTemplates, addressTemplate, paymentTemplate);

        sinon.spy(EventBus, 'trigger');
        sinon.stub(ep.io, 'ajax');

        var parsedJSONData = JSON.parse(_.clone(dataJSON));
        var parsedFakeResponse = parsedJSONData.response;

        // Remove the deliveryType attribute
        delete(parsedFakeResponse._deliveries[0]._element[0]['delivery-type']);

        this.server = getFakeCheckoutServer(parsedJSONData.zoom, parsedFakeResponse);

        this.view = new controller.DefaultController();
        this.view.render();

        // Notify Mocha that the 'before' hook is complete when the checkout order region is shown
        this.view.checkoutOrderRegion.on('show', function() {
          done();
        });

      });

      after(function () {
        $("#Fixtures").empty();
        EventBus.trigger.restore();
        ep.io.ajax.restore();
        ep.io.localStore.removeItem(ep.app.config.cortexApi.scope + '_oAuthToken');
        ep.io.sessionStore.removeItem('orderLink');
        this.server.restore();
      });

      it("does not show shipping addresses or shipping options", function() {
        // The shipping addresses region from the checkout summary template is not populated
        expect(this.view.$el.find('[data-region="shippingAddressesRegion"]').children().length).to.be.eql(0);
        // The shipping options region from the checkout summary template is not populated
        expect(this.view.$el.find('[data-region="shippingOptionsRegion"]').children().length).to.be.eql(0);
      });
    });

    describe("Given there are no item requiring payment in the cart", function() {
      // Fake a server response without a 'paymentmethodinfo', which is used to determine if payment methods should
      // show in checkout right now.
      before(function (done) {
        $("#Fixtures").append(checkoutTemplates, addressTemplate, paymentTemplate);

        sinon.spy(EventBus, 'trigger');
        sinon.stub(ep.io, 'ajax');

        var parsedJSONData = JSON.parse(_.clone(dataJSON));
        var parsedFakeResponse = parsedJSONData.response;

        // Remove the deliveryType attribute
        delete(parsedFakeResponse._paymentmethodinfo);

        this.server = getFakeCheckoutServer(parsedJSONData.zoom, parsedFakeResponse);

        this.view = new controller.DefaultController();
        this.view.render();

        // Notify Mocha that the 'before' hook is complete when the checkout order region is shown
        this.view.checkoutOrderRegion.on('show', function() {
          done();
        });

      });

      after(function () {
        $("#Fixtures").empty();
        EventBus.trigger.restore();
        ep.io.ajax.restore();
        ep.io.localStore.removeItem(ep.app.config.cortexApi.scope + '_oAuthToken');
        ep.io.sessionStore.removeItem('orderLink');
        this.server.restore();
      });

      it("does not show payment method", function() {
        // The payment method region from the checkout summary template is not populated
        expect(this.view.$el.find('[data-region="paymentMethodsRegion"]').children()).to.be.length(0);
      });
    });
  });

  /**
   * Helper function to create a sinon fakeServer object to fake the checkout model fetch in the controller code.
   * @param zoom A zoom string to append to the fake URL.
   * @param response A parsed JSON response with which the fake server will respond.
   * @returns {Object} A sinon fakeServer object.
   */
  function getFakeCheckoutServer (zoom, response) {
    var fakeGetLink = "/integrator/orders/fakeUrl";
    var fakeCheckoutServer = sinon.fakeServer.create();

    ep.io.localStore.setItem(ep.app.config.cortexApi.scope + '_oAuthToken', 'fakeToken');

    fakeCheckoutServer.autoRespond = true;

    fakeCheckoutServer.respondWith(
      "GET",
      fakeGetLink + zoom,
      [
        200,
        {"Content-Type": "application/json"},
        JSON.stringify(response)
      ]
    );

    ep.io.sessionStore.setItem('orderLink', fakeGetLink);

    return fakeCheckoutServer;
  }

});
