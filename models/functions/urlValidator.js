var urlRegExp = /^\s*(https?|ftp):\/\/[^\s/$.?#].[^\s]*\s*$/;

module.exports = {
	validator: function(val) {
		return urlRegExp.test(val);
	},
	message: '{VALUE} is not a valid URL'
};
