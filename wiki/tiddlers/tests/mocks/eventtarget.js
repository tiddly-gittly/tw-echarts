exports.EventTarget = Object.create(null);

exports.EventTarget.addEventListener = function(type, method) {
	if (!this.eventListeners) {
		this.eventListeners = new Map();
	}
	if (this.eventListeners.has(type)) {
		throw new Exception("The Mock EventTarget class doesn't support multiple handlers on the same type yet. It'll need to be elaborated before this test can proceed.");
	}
	this.eventListeners.set(type, method);
};

exports.EventTarget.removeEventListener = function(type, method) {
	if (this.eventListeners && this.eventListeners.has(type)) {
		this.eventListeners.delete(type);
	}
};

exports.EventTarget.dispatchEvent = function(event) {
	if (this.eventListeners && this.eventListeners.has(event.type)) {
		var listener = this.eventListeners.get(event.type);
		if (typeof listener === "function") {
			listener(event);
		} else {
			listener.handleEvent(event);
		}
	}
};
