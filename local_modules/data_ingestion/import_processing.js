//
module.exports.Ops = 
{
    Join: "Join"
};
//
module.exports.MatchFns = 
{
    LocalEqualsForeignString: function(localFieldValue, foreignFieldValue) 
    {
        var returnValue = (localFieldValue === foreignFieldValue);
        if (returnValue === true) {
            // console.log(localFieldValue + " matches exactly " + foreignFieldValue);
        }
        
        return returnValue;
    },
    LocalContainsForeignString: function(localFieldValue, foreignFieldValue) 
    {
        if (foreignFieldValue.length == 0) {
            return false;
        }
        if (localFieldValue.toLowerCase().indexOf(foreignFieldValue.toLowerCase()) != -1) {
            // console.log("\"" + foreignFieldValue + "\" is contained in \"" + localFieldValue + "\" ")
            return true;
        }
        
        return false;
    },
    ForeignContainsLocalString: function(localFieldValue, foreignFieldValue) 
    {
        if (localFieldValue.length == 0) {
            return false;
        }
        if (foreignFieldValue.toLowerCase().indexOf(localFieldValue.toLowerCase()) != -1) {
            // console.log("\"" + localFieldValue + "\" is contained in \"" + foreignFieldValue + "\" ")
            return true;
        }
        
        return false;
    }
};
//
module.exports.MatchRegexs =
{

    RegexLocalEqualsForeignString: function(localFieldValue)
    {

        return {
            $regex: "^" + localFieldValue + "$",
            $options: 'i'
        };
    },
    RegexLocalContainsForeignString: function(localFieldValue)
    {
        return {
            $regex: localFieldValue,
            $options: 'i'
        }
    }
}