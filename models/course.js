var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var coursesTotal;
// on open connection get number of elements in the courses collection
mongoose.connection.once('open', function(){
    CourseModel.count({}, function(err, count){
        console.log('Courses Total error:', err);
        console.log('Courses Total = ' + count);
        // gets 0 if no collection is empty
        coursesTotal = count;
    });
});

var Course = new Schema({
    // assign id the number of the course in order of creation
    _id: {type: Number, default: function(){ return coursesTotal++;}},
    name: {type: String, required: true},
    weeks: [{type: Schema.Types.ObjectId, ref: 'Week'}],
}
// , {timestamps: true}
);

Course.statics.getCoursesWithWeeks = function (arg1, arg2) {
    if(arg2)    //arg2 is Function, arg1 is fields filter
        return this.find({}).populate('weeks', arg1).exec(arg2);
    else    //arg1 is Function
        return this.find({}).populate('weeks').exec(arg1);
};

Course.statics.getCourseWithWeeks = function (courseId, arg1, arg2) {
    if(arg2)    //arg2 is Function, arg1 is fields filter
        return this.findById(courseId).populate('weeks', arg1).exec(arg2);
    else    //arg1 is Function
        return this.findById(courseId).populate('weeks').exec(arg1);
}

var CourseModel = mongoose.model('Course', Course);

// try to insert some courses
// setTimeout(function(argument){
//     var c1 = new CourseModel({name: "NEW COURSE1"});
//     c1.save(function(err){
//         console.log("Saving Error:", err);
//     });
//
//     var c2 = new CourseModel({name: "NEW COURSE2"});
//     c2.save(function(err){
//         console.log("Saving Error:", err);
//     });
//
//     var c3 = new CourseModel({name: "NEW COURSE3"});
//     c3.save(function(err){
//         console.log("Saving Error:", err);
//     });
//
//     // CourseModel.update({_id: 7}, {name: "renamed"}).exec();
// },1000);


module.exports = CourseModel;

// can also assign count to _id like this
// Course.pre('save', function(next) {
//     this.model('Course').count({}, function(err, count){
//         this._id = count;
//     });
//     // or
//     this._id = total++;
// });

// module.exports = mongoose.model('Course', Course);
