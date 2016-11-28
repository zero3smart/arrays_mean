module.exports = function validateRequest(req,res,next) {

  if (req.payload) {
    console.log(req.payload)
  }

  if (req.user) {
    return next();
  } else {
    return res.status(401).json({status:"error",code:'unauthorized'});
  }
}