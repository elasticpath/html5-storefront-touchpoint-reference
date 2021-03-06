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
  var Backbone = require('backbone');
  var EventBus = require('eventbus');
  var Mediator = require('mediator');
  var EventTestHelpers = require('testhelpers.event');
  var EventTestFactory = require('testfactory.event');

  describe('Payment Method Events', function () {
    require('checkout');

    describe('Responds to event: checkout.paymentMethodRadioChanged', function() {
      before(function () {
        sinon.spy(EventBus, 'trigger');
        EventTestHelpers.unbind('checkout.updateChosenPaymentMethodRequest');
        EventBus.trigger('checkout.paymentMethodRadioChanged', 'fakeSelectAction');
      });

      after(function () {
        EventBus.trigger.restore();
        EventTestHelpers.reset();
      });
      it('triggers event: checkout.updateChosenSelectionRequest', function () {
        expect(EventBus.trigger).to.be.calledWithExactly('checkout.updateChosenPaymentMethodRequest', 'fakeSelectAction');
      });

    });

    describe('Responds to event: checkout.updateChosenPaymentMethodRequest', function () {
      var fakeActionLink = 'fakeActionLink';

      before(function () {
        sinon.spy(EventBus, 'trigger');
        sinon.stub(ep.logger, 'error');
        sinon.stub(ep.ui, 'startActivityIndicator');
        sinon.stub(ep.io, 'ajax');

        EventBus.trigger('checkout.updateChosenPaymentMethodRequest', fakeActionLink);
        // get first argument passed to ep.io.ajax,
        // args[0] gets arguments passed in the first time ep.io.ajax is called
        // args[0][0] gets the first argument of the first time arguments
        this.ajaxArgs = ep.io.ajax.args[0][0];
      });

      after(function () {
        EventBus.trigger.restore();
        ep.logger.error.restore();
        ep.ui.startActivityIndicator.restore();
        ep.io.ajax.restore();
      });

      describe('should inform Cortex of selection made', function () {
        it('exactly once', function () {
          expect(ep.io.ajax).to.be.calledOnce;
        });
        it('with a valid request', function () {
          expect(this.ajaxArgs.type).to.be.string('POST');
          expect(this.ajaxArgs.contentType).to.be.string('application/json');
          expect(this.ajaxArgs.url).to.be.equal(fakeActionLink);
        });
        it('with required callback functions', function () {
          expect(this.ajaxArgs.success).to.exist;
          expect(this.ajaxArgs.error).to.exist;
        });
      });

      describe('and on success',
        EventTestFactory.simpleTriggerEventTest('checkout.updateChosenPaymentMethodSuccess', function () {
          var testEventName = 'checkout.updateChosenPaymentMethodSuccess';

          it('should trigger ' + testEventName + ' event', function () {
            // trigger callback function on ajax call success
            this.ajaxArgs.success();
            expect(EventBus.trigger).to.be.calledWithExactly(testEventName);
          });
        }));

      describe('and on failure',
        EventTestFactory.simpleTriggerEventTest('checkout.updateChosenPaymentMethodFailed', function () {
          var testEventName = 'checkout.updateChosenPaymentMethodFailed';

          it('should trigger ' + testEventName + ' event', function () {
            this.ajaxArgs.error({
              status: 'any error code'
            });
            expect(EventBus.trigger).to.be.calledWithExactly(testEventName);
          });
        }));
    });

    describe('Responds to event: checkout.addNewPaymentMethodBtnClicked', function () {
      before(function () {
        sinon.stub(Mediator, 'fire');
        EventBus.trigger('checkout.addNewPaymentMethodBtnClicked');
      });

      after(function () {
        Mediator.fire.restore();
      });

      it("registers correct event listener", function () {
        expect(EventBus._events['checkout.addNewPaymentMethodBtnClicked']).to.have.length(1);
      });

      it("calls correct mediator strategy", function() {
        expect(Mediator.fire).to.be.calledWithExactly('mediator.addNewPaymentMethodRequest', 'checkout');
      });
    });

    describe('Responds to event: checkout.deletePaymentBtnClicked', function () {
      var fakeHref = "fakeDeletePaymentActionLink";
      before(function () {
        sinon.stub(Mediator, 'fire');

        EventBus.trigger('checkout.deletePaymentBtnClicked', fakeHref);
      });

      after(function () {
        Mediator.fire.restore();
      });

      it('calls the correct mediator strategy', function () {
        expect(Mediator.fire).to.be.calledWith('mediator.deletePaymentRequest');
      });
    });

    describe('Responds to event: checkout.updatePaymentMethods', function () {
      before(function () {
        sinon.stub(Backbone.Model.prototype, 'fetch');
        sinon.stub(ep.ui, 'startActivityIndicator');

        ep.io.sessionStore.setItem('orderLink', 'fakeToken');

        EventBus.trigger('checkout.updatePaymentMethods');
      });
      after(function () {
        Backbone.Model.prototype.fetch.restore();
        ep.ui.startActivityIndicator.restore();
        ep.io.sessionStore.removeItem('orderLink');
      });
      it('calls Backbone.Model.fetch to update the profile model', function () {
        expect(Backbone.Model.prototype.fetch).to.be.called;
      });
    });

  });

});
