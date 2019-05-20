/**
 * Copyright (C) 2015 - Rajesh Sola <rajeshsola@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
// Prepared based on Sample Node-RED node file,99-sample.js.demo

module.exports = function(RED) {
    "use strict";
    var can = require('socketcan');
    var random = require('random-js')();	//uses native engine

	function processMessage(msg) {
		if (typeof(msg.channel) === 'undefined') {
			msg.channel = this.channel;
		}

		var frame   = {};
		var payload = msg.data || msg.payload || this.payload;
		// Either the message, the message payload, or the payload from node-red configuration can now hold canid and can data.
		//   If data comes in as an array, it now gets converted appropriately to a buffer.
		if(typeof(payload) !== 'undefined' && payload.indexOf("#") !== -1) {
			frame.canid = parseInt(msg.payload.split("#")[0]);
			frame.data  = new Buffer(msg.payload.split("#")[1]);
		} else if (Array.isArray(payload)) {
			frame.canid = msg.canid || this.canid || 0;
			frame.data  = new Buffer(payload);
		} else if (typeof(payload) === 'string' && payload.startsWith('[')) {
			frame.canid = msg.canid || this.canid || 0;
			frame.data  = new Buffer(JSON.parse(payload));
		} else if (typeof(payload) !== 'undefined') {
			frame.canid = parseInt(msg.canid || (payload || {}).canid || (this.payload || {}).canid || this.canid || 0);
			if (Array.isArray(payload.data)) {
				frame.data = Buffer.from(payload.data);
			} else if (typeof(payload.data) === 'string' && payload.data.startsWith("[")) {
				frame.data = Buffer.from(JSON.parse(payload.data));
			} else if (typeof(payload.data) === 'Buffer') {
				frame.data = Buffer.payload;
			} else {
				node.error("Can data missing or not defined in a format that could be processed!");
			}
		} else {
			node.error("Can data missing or not defined in a format that could be processed!");
		}
		frame.dlc = frame.data.length;

		if(frame.canid === 0)   //canid is not yet set
		{
			frame.canid = random.integer(1, 4095);
		}
		node.warn("canid: " + frame.canid + ", data: " + frame.data + ", dlc: " + frame.dlc);

		if (frame.dlc <= 8)	{
			canChannel.send({
				id:   frame.canid,
				ext:  false,
				data: frame.data
			});
		} else {
			node.warn("frame data is too long");
		}
	}

	function CanSendNode(n) {
        RED.nodes.createNode(this, n);

		this.config = RED.nodes.getNode(n.config);
		if (typeof(n.channel) !== 'undefined') {
			this.channel = n.channel.toString();
		} else if (typeof(this.config) !== 'undefined') {
			this.channel = this.config.channel.toString();
		} else {
			this.channel = "vcan0";
		}

		this.canid   = n.canid;
		this.payload = n.payload;

        var node = this;
		node.warn("id=" + this.canid + ", channel=" + this.channel);

		try {
			var canChannel = can.createRawChannel(this.channel, true);
		}catch(ex) {
			node.error("channel not found:" + this.channel);
		}

		if(typeof(canChannel) !== 'undefined')
		{
			canChannel.start();

			// respond to inputs....
			this.on('input', processMessage);

			//TODO: Support for extended frames, other cansend options
			this.on("close", function() {
				canChannel.stop();
			});
		}
	}

    RED.nodes.registerType("cansend", CanSendNode);
}
