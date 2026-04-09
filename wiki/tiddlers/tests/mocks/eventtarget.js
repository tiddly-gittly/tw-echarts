exports.EventTarget = Object.create(null);

exports.EventTarget.addEventListener = function(type, method, useCapture) {
	var set = getHandlers.call(this, type, useCapture);
	set.add(method);
};

exports.EventTarget.removeEventListener = function(type, method, useCapture) {
	var set = getHandlers.call(this, type, useCapture);
	set.delete(method);
};

exports.EventTarget.dispatchEvent = function(event) {
	function invoke(listener) {
		if (typeof listener === "function") {
			listener(event);
		} else {
			listener.handleEvent(event);
		}
	};
	// call the capturing events, then the bubbling ones
	getHandlers.call(this, event.type, true).forEach(invoke);
	getHandlers.call(this, event.type, false).forEach(invoke);
};

exports.EventTarget.on = function(type, method, context) {
	this.addEventListener(type, function() {
		method.apply(context, arguments);
	});
};

function getHandlers(type, useCapture) {
	var listeners = this.eventListeners;
	if (!listeners) {
		listeners = this.eventListeners = new Map();
	}
	useCapture = useCapture || false;
	const key = "" + useCapture + type;
	if (!listeners.has(key)) {
		listeners.set(key, new Set());
	}
	return listeners.get(key);
};
