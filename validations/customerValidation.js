const joi = require("joi")

const customerSchema = joi.object({
    email:
        joi.string(),
        
})