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
 * Example controller template.
 */
define(function (require) {
        var ep = require('ep');                 // import global app functions and variables
        var EventBus = require('eventbus');     // import event-bus communicating within module
        var Mediator = require('mediator');     // import global event-bus mediating communication between modules

        var pace = require('pace');             // import activity indicator function

        // import the module's model, view and template
        var Model = require('tmpl.models');
        var View = require('tmpl.views');
        var template = require('text!modules/base/_template/base.tmpl.templates.html');

        // Inject the template into TemplateContainer for the module's views to reference
        $('#TemplateContainer').append(template);

        // Create a namespace for the template to reference the model and the viewHelpers
        _.templateSettings.variable = 'E';

        /**
         * Renders the DefaultLayout of template module and fetches the model from the backend.
         * Upon successfully fetching the model, the views are rendered in the designated regions.
         */
        var defaultView = function(){

            //instantiate the module's View and Model
            var defaultLayout = new View.DefaultLayout();
            var templateModel = new Model.TmplModel();

            //Fetch is a Backbone.model functionality.
            //Fetch resets the model's state and retrieves data from Cortex API using an jQuery jqXHR Object.
            templateModel.fetch({

                //on success, do something with the retrieved data, like render a view, set values, and so on
                success: function (response) {

                },
                //account for error conditions
                error: function (response) {

                }
            });

        };


        return {
            DefaultView:defaultView
        };
    }
);
