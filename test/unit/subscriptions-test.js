/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),
    should = require('should'),
    request = require('request'),
    nock = require('nock'),
    contextBrokerMock,
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Subscription tests', function() {
    beforeEach(function(done) {
        var optionsProvision = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        nock.cleanAll();

        iotAgentLib.activate(iotAgentConfig, function() {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/contextRequests/createMinimumProvisionedDevice.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/subscribeContext',
                    utils.readExampleFile('./test/unit/subscriptionRequests/simpleSubscriptionRequest.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/subscriptionResponses/simpleSubscriptionSuccess.json'));

            iotAgentLib.clearAll(function() {
                request(optionsProvision, function(error) {
                    done();
                });
            });
        });
    });

    afterEach(function(done) {
        nock.cleanAll();
        iotAgentLib.setProvisioningHandler();
        iotAgentLib.deactivate(done);
    });

    describe('When a client invokes the subscribe() function for device', function() {
        it('should send the appropriate request to the Context Broker', function(done) {
            iotAgentLib.getDevice('MicroLight1', function(error, device) {
                iotAgentLib.subscribe(device, ['attr_name'], null, function(error) {
                    should.not.exist(error);

                    contextBrokerMock.done();

                    done();
                });
            });
        });
        it('should store the subscription ID in the Device Registry', function(done) {
            iotAgentLib.getDevice('MicroLight1', function(error, device) {
                iotAgentLib.subscribe(device, ['attr_name'], null, function(error) {
                    iotAgentLib.getDevice('MicroLight1', function(error, device) {
                        should.not.exist(error);
                        should.exist(device);
                        should.exist(device.subscriptions);
                        device.subscriptions.length.should.equal(1);
                        device.subscriptions[0].id.should.equal('51c0ac9ed714fb3b37d7d5a8');
                        device.subscriptions[0].triggers[0].should.equal('attr_name');
                        done();
                    });
                });
            });
        });
    });
    describe('When a client invokes the unsubscribe() function for an entity', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContextSubscription',
                    utils.readExampleFile('./test/unit/subscriptionRequests/simpleSubscriptionUpdate.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/subscriptionResponses/simpleSubscriptionSuccess.json'));

            done();
        });
        it('should change the expiration date of the subscription to 0s', function(done) {
            iotAgentLib.getDevice('MicroLight1', function(error, device) {
                iotAgentLib.subscribe(device, ['attr_name'], null, function(error) {
                    iotAgentLib.unsubscribe(device, '51c0ac9ed714fb3b37d7d5a8', function(error) {
                        iotAgentLib.getDevice('MicroLight1', function(error, device) {
                            contextBrokerMock.done();
                            done();
                        });
                    });
                });
            });
        });
        it('should remove the id from the subscriptions array', function(done) {
            iotAgentLib.getDevice('MicroLight1', function(error, device) {
                iotAgentLib.subscribe(device, ['attr_name'], null, function(error) {
                    iotAgentLib.unsubscribe(device, '51c0ac9ed714fb3b37d7d5a8', function(error) {
                        iotAgentLib.getDevice('MicroLight1', function(error, device) {
                            should.not.exist(error);
                            should.exist(device);
                            should.exist(device.subscriptions);
                            device.subscriptions.length.should.equal(0);
                            done();
                        });
                    });
                });
            });
        });
    });
    describe('When a client removes a device from the registry', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContextSubscription',
                    utils.readExampleFile('./test/unit/subscriptionRequests/simpleSubscriptionUpdate.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/subscriptionResponses/simpleSubscriptionSuccess.json'));

            done();
        });

        it('should change the expiration dates of all its subscriptions to 0s', function(done) {
            iotAgentLib.getDevice('MicroLight1', function(error, device) {
                iotAgentLib.subscribe(device, ['attr_name'], null, function(error) {
                    iotAgentLib.unregister(device.id, function(error) {
                        contextBrokerMock.done();
                        done();
                    });
                });
            });
        });
    });
    describe('When a new notification comes to the IoTAgent', function() {
        it('should invoke the user defined callback');
        it('should get the correspondent device information');
    });
});
