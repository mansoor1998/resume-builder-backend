const validator = (schema) => {
    return (req, res, next) => {
        const result = schema.validate(req.body, { abortEarly: false });
        if(result.error){
            return res.status(400).json({
                message: result.error.details.map(x => x.message)
            });
        }

        next();
    }
}

module.exports = validator;