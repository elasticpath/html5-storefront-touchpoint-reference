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
 *
 *
 */
define(function (require) {
    var ep = require('ep');
    var Marionette = require('marionette');
    var Backbone = require('backbone');
    var i18n = require('i18n');
    var EventBus = require('eventbus');
    var Mediator = require('mediator');
    var pace = require('pace');
    var ViewHelpers = require('viewHelpers');

    pace.start();
    var viewHelpers = ViewHelpers.extend ({
      getAvailabilityDisplayText:function(availability){
        var retVal = '';
        switch(availability){
          case 'AVAILABLE':
            retVal = this.getI18nLabel('availability.AVAILABLE');
            break;
          case 'ALWAYS':
            retVal = this.getI18nLabel('availability.ALWAYS');
            break;
          case 'NOT_AVAILABLE':
            retVal = this.getI18nLabel('availability.NOT_AVAILABLE');
            break;
          case 'AVAILABLE_FOR_BACK_ORDER':
            retVal = this.getI18nLabel('availability.AVAILABLE_FOR_BACK_ORDER');
            break;
          case 'AVAILABLE_FOR_PRE_ORDER':
            retVal = this.getI18nLabel('availability.AVAILABLE_FOR_PRE_ORDER');
            break;
          default:
            retVal = '';
        }
        return retVal;
      },
      getAvailabilityReleaseDate: function (releaseDate) {
        var retVar = '';

        if (releaseDate && releaseDate.displayValue) {
          retVar = releaseDate.displayValue;
        }

        return retVar;
      },
      getListPrice: function (priceObj) {
        var retVar = '';

        if (priceObj) {
          if (priceObj.listed && priceObj.listed.display) {
            retVar = priceObj.listed.display;
          }
        }

        return retVar;
      },
      getPurchasePrice: function (priceObj) {
        var retVar = '';

        if (priceObj) {
          if (priceObj.purchase && priceObj.purchase.amount >= 0) {
            retVar = priceObj.purchase.display;
          }
          else {
            retVar = this.getI18nLabel('itemDetail.noPrice');
          }
        }

        return retVar;
      },
      getDefaultImagePath:function(thumbnail){
        var retVar;
        if (thumbnail && thumbnail.absolutePath){
          retVar = thumbnail.absolutePath;
        }
        else{
         retVar = 'images/img-placeholder.png';
        }
        return retVar;
      },
      getDefaultImageName:function(thumbnail){
        var retVar;
        if (thumbnail && thumbnail.name){
          retVar = thumbnail.name;
        }
        else{
          retVar = this.getI18nLabel('itemDetail.noImgLabel');
        }
        return retVar;
      },
      getItemUrl:function(link){
        var retVar;
        if (link) {
          retVar = ep.app.config.routes.itemDetail + '/' + ep.ui.encodeUri(link);
        } else {
          retVar = '';
          ep.logger.warn('[cart]: unable to generate href to item-detail');
        }

        return retVar;
      },
      /**
       * Returns a disabled attribute for the checkout button if there is not at least one item in the cart.
       * @param model The checkout model.
       * @returns {string} The disabled attribute or empty string.
       */
      getCheckoutButtonDisabledAttr:function(model){
        return ViewHelpers.getButtonDisabledAttr(function() {
          return (model.cartTotalQuantity > 0);
        });
      },
      checkIfVisible:function(model){
        if (model.amount.display){
         return null;
        }
        return 'is-hidden';
      },
      /**
       * generate HTML markup for options inside a select of a given range
       * @param min     minimum number of option range
       * @param max     maximum number of option range
       * @param quantity  initial selected quantity
       * @returns {string}  options HTML markup of a given range
       */
        // FIXME convert using generateNumericOptions
      createQuantityOptions:function(min, max, quantity) {
        var optionHtml = '';
        var selected = '';

        for (var i = min; i <= max; i++) {
          // e.g. <option value="1" selcted="selected">1</option>
          if (i === quantity) {
            selected = 'selected="selected"';
          } else {
            selected = '';
          }
          optionHtml += '<option value="' + i + '"' + selected + ' >' + i + '</option>' ;
        }

        return optionHtml;
      }
    });

    /*
    * Functions
    *
    * */
    // Default Layout
    var defaultLayout = Marionette.Layout.extend({
      template:'#DefaultCartLayoutTemplate',
      templateHelpers:viewHelpers,
      className:'cart-container container',
      regions:{
        cartTitleRegion:'[data-region="cartTitleRegion"]',
        mainCartRegion:'[data-region="mainCartRegion"]',
        cartCheckoutMasterRegion:'[data-region="cartCheckoutMasterRegion"]'
      },
      onShow:function(){
        Mediator.fire('mediator.cart.DefaultViewRendered');
      }
    });

    /**
     * A layout containing the cart summary and checkout action elements.
     * The $el object returned by this view is not a suitable target for an activity indicator
     * so the ui.activityIndicatorEl property is used to specify a more suitable object.
     *
     * @type {Marionette.Layout}
     */
    var cartCheckoutMasterLayout = Marionette.Layout.extend({
      template:'#CartCheckoutMasterLayoutTemplate',
      regions:{
        cartSummaryRegion:'[data-region="cartSummaryRegion"]',
        cartCheckoutActionRegion:'[data-region="cartCheckoutActionRegion"]'
      },
      ui: {
        // A jQuery selector for the DOM element to which an activity indicator should be applied.
        activityIndicatorEl: '.cart-sidebar-inner'
      }
    });

    // Cart Title View
    var cartTitleView = Marionette.ItemView.extend({
      template:'#CartTitleTemplate',
      templateHelpers:viewHelpers
    });

    // Cart Line Item Layout
    var cartLineItemLayout = Marionette.Layout.extend({
      template:'#CartLineItemTemplate',
      tagName:'tr',
      templateHelpers:viewHelpers,
      regions: {
        cartLineitemAvailabilityRegion: '[data-region="cartLineitemAvailabilityRegion"]',
        cartLineitemUnitPriceRegion: '[data-region="cartLineitemUnitPriceRegion"]',
        cartLineitemTotalPriceRegion: '[data-region="cartLineitemTotalPriceRegion"]'
      },
      events:{
        'click .btn-cart-removelineitem':function(event){
          var actionLink = $(event.currentTarget).data("actionlink");
          EventBus.trigger('cart.removeLineItemBtnClicked', actionLink);
        },

        'change .cart-lineitem-quantity-select': function(event) {
          var actionLink = this.model.get('lineitemLink');
          var quantities = {
            original: this.model.get('quantity'),
            changeTo: $(event.target).val()
          };
          EventBus.trigger('cart.lineItemQuantityChanged', actionLink, quantities);
        }
      },
      onShow:function(){
        // show availability if at least has availability state
        if (this.model.get('availability').state) {
          this.cartLineitemAvailabilityRegion.show(
            new ItemAvailabilityView({
              model: new Backbone.Model(this.model.get('availability'))
            })
          );
        }

        // show unit price
        this.cartLineitemUnitPriceRegion.show(
          new ItemUnitPriceLayout({
            model: new Backbone.Model({
              price: this.model.attributes.unitPrice,
              rateCollection: this.model.attributes.unitRateCollection
            })
          })
        );

        // show total price
        this.cartLineitemTotalPriceRegion.show(
          new ItemTotalPriceLayout({
            model: new Backbone.Model({
              price: this.model.attributes.price,
              rateCollection: this.model.attributes.rateCollection
            })
          })
        );

      }
    });

    // Item Availability
    var ItemAvailabilityView = Marionette.ItemView.extend({
      template: '#CartLineItemAvailabilityTemplate',
      templateHelpers: viewHelpers,
      tagName: 'ul',
      className: 'cart-lineitem-availability-container',
      onShow: function () {
        // if no release date, hide dom element with release-date & the label
        if (!viewHelpers.getAvailabilityReleaseDate(this.model.get('releaseDate'))) {
          $('[data-region="itemAvailabilityDescriptionRegion"]', this.el).addClass('is-hidden');
        }
      }
    });

    //
    // price master view
    //
    var ItemUnitPriceLayout = Marionette.Layout.extend({
      template: '#CartLineItemUnitPriceMasterTemplate',
      regions: {
        itemPriceRegion: $('[data-region="itemUnitPriceRegion"]', this.el),
        itemRateRegion: $('[data-region="itemUnitRateRegion"]', this.el)
      },
      onShow: function () {
        // if item has rate, load rate view
        if (this.model.attributes.rateCollection.length > 0) {
          this.itemRateRegion.show(
            new ItemRateCollectionView({
              className: 'cart-lineitem-unit-rate-container',
              collection: new Backbone.Collection(this.model.attributes.rateCollection)
            })
          );
        }

        // if item has one-time purchase price, load price view
        if (this.model.get('price').purchase.display) {
          this.itemPriceRegion.show(
            new ItemPriceView({
              template: '#CartLineItemUnitPriceTemplate',
              model: new Backbone.Model(this.model.attributes.price)
            })
          );
        }

        // no price nor rate scenario is handled at model level
        // an item price object is created with artificial display value
      }
    });

    var ItemTotalPriceLayout = Marionette.Layout.extend({
      template: '#CartLineItemTotalPriceMasterTemplate',
      regions: {
        itemPriceRegion: $('[data-region="itemTotalPriceRegion"]', this.el),
        itemRateRegion: $('[data-region="itemTotalRateRegion"]', this.el)
      },
      onShow: function () {
        // if item has rate, load rate view
        if (this.model.attributes.rateCollection.length > 0) {
          this.itemRateRegion.show(
            new ItemRateCollectionView({
              className: 'cart-lineitem-total-rate-container',
              collection: new Backbone.Collection(this.model.attributes.rateCollection)
            })
          );
        }

        // if item has one-time purchase price, load price view
        if (this.model.get('price').purchase.display) {
          this.itemPriceRegion.show(
            new ItemPriceView({
              template: '#CartLineItemTotalPriceTemplate',
              model: new Backbone.Model(this.model.attributes.price)
            })
          );
        }

        // no price nor rate scenario is handled at model level
        // an item price object is created with artificial display value
      }
    });


    // Item Price View
    var ItemPriceView = Marionette.ItemView.extend({
      templateHelpers: viewHelpers,
      className: 'cart-lineitem-price-container',
      tagName: 'ul',
      onShow: function () {
        if (!viewHelpers.getListPrice(this.model.attributes)) {
          $('[data-region="itemListPriceRegion"]', this.$el).addClass('is-hidden');
        }
      }
    });

    // Item Rate ItemView
    var itemRateItemView = Marionette.ItemView.extend({
      template: '#CartLineItemRateTemplate',
      templateHelpers: viewHelpers,
      className: 'cart-lineitem-rate',
      tagName: 'li'
    });

    // Item Rate CollectionView
    var ItemRateCollectionView = Marionette.CollectionView.extend({
      itemView: itemRateItemView,
      tagName: 'ul'
    });

    // Empty Cart View
    var emptyCartView = Marionette.ItemView.extend({
      template:'#EmptyCartTemplate',
      templateHelpers:viewHelpers,
      className:"cart-empty-container"
    });

    // Main Cart View
    var mainCartView = Marionette.CompositeView.extend({
      template:'#MainCartTemplate',
      itemView:cartLineItemLayout,
      itemViewContainer:'tbody',
      className:'cart-main-inner table-responsive',
      templateHelpers:viewHelpers,
      onShow:function(){
        pace.stop();
      }
    });

    // Cart Summary View
    var cartSummaryView = Marionette.ItemView.extend({
      template:'#CartSummaryTemplate',
      templateHelpers:viewHelpers,
      modelEvents: {
        'change': function() {
          this.render();
          if (!this.model.attributes.appliedPromotions) {
            $('[data-region="cartAppliedPromotionsRegion"]', this.$el).addClass('is-hidden');
          }
        }
      },
      onShow: function () {
        if (!this.model.attributes.appliedPromotions) {
          $('[data-region="cartAppliedPromotionsRegion"]', this.$el).addClass('is-hidden');
        }
      }
    });

    // Cart Checkout Action View
    var cartCheckoutActionView = Marionette.ItemView.extend({
      template:'#CartCheckoutActionTemplate',
      templateHelpers:viewHelpers,
      modelEvents: {
        'change': function() {
          this.render();
        }
      },
      events:{
        'click .btn-cmd-checkout':function(event){
          EventBus.trigger('cart.checkoutBtnClicked',this.model.get('checkoutLink'));
        }
      }
    });

    /**
     * This view is rendered in the modal region to obtain confirmation from the user before proceeding
     * with a request to remove a line item from the cart.
     */
    var cartRemoveLineItemConfirmView = Marionette.ItemView.extend({
      className:'cart-remove-confirm-modal',
      template:'#CartRemoveLineItemConfirmModalTemplate',
      templateHelpers:viewHelpers,
      events:{
        'click .btn-yes':function(event) {
          event.preventDefault();
          EventBus.trigger('cart.removeLineItemConfirmYesBtnClicked', this.options.href);
        },
        'click .btn-no':function(event) {
          event.preventDefault();
          $.modal.close();
        }
      }
    });

    /* ********* Helper functions ********* */
    /**
     * Reset a lineItem's quantity to original value recorded in model.
     */
    function resetQuantity(originalQty) {
      $('[data-el-value="lineItem.quantity"] option[value="' + originalQty + '"]').prop('selected', true);
    }

    return {
      DefaultLayout:defaultLayout,
      CartTitleView:cartTitleView,
      MainCartView:mainCartView,
      CartLineItemLayout:cartLineItemLayout,
      EmptyCartView:emptyCartView,
      CartSummaryView:cartSummaryView,
      CartCheckoutActionView:cartCheckoutActionView,
      CartCheckoutMasterLayout:cartCheckoutMasterLayout,
      CartRemoveLineItemConfirmView: cartRemoveLineItemConfirmView,
      resetQuantity: resetQuantity
    };
  }
);
