module.exports = function verifyRules(body, rules){
    try{
        const ruleBody = rules.body;
        let invalidBody = false;
        
        for(let item in body){
            
            if(item === 'columns') continue;
            let typeOfItem = typeof body[item];
            let rule = ruleBody[item]
            let result = checkValidDataType(body[item], rule);
            if(!result) return false;
        }
    
    
        if(body['columns'])
            for(let column of body['columns']){ 
                for(let item of column){
                    let itemType = item.type 
                    const layoutRule = rules.body['layout'][itemType];
    
                    if(!layoutRule) {
                        console.log('does not work out');
                        return false;
                    }
    
                    for(let sec in item){
                        if(sec === 'type') continue;
                        let rule = layoutRule[sec];
                        let result = checkValidDataType(item[sec], rule);
                        if(!result) return false;
                    }
                }
            }
    
        return true;
    
    }catch(e){
        throw e;
    }
}

function checkValidDataType(obj, rule){

    const type = rule.type;    
	
	if(Array.isArray(type) && Array.isArray ( obj )){
		for(let i = 0; i < obj.length; i++){
			let validity = checkValidDataType(obj[i], type[0]);
            if(!validity) return false;
		}
	}
	else if (!type && typeof rule === "object" && typeof obj === "object" ) {
		for(let key in obj){
            
            // if ( Array.isArray(rule[key].type)  ){
            //     let valid = checkValidDataType(obj[key], rule[key].type );
            //     if(!valid) return false;
            // }
            if(typeof rule[key].type === 'object' && typeof obj[key] !== typeof rule[key].type){
                return false;
            }
            else if ( typeof rule[key].type !== 'object' && typeof obj[key] !== rule[key].type ){
                return false;
            } else if ( Array.isArray ( rule[key].type ) ) {
                let valid = checkValidDataType(obj[key], rule[key])
                if(!valid) return false;
            }
		}
	}
    else if ( typeof type === "object" && typeof obj === "object" ) {
        for(let key in obj){
            let valid = checkValidDataType(obj[key], type[key]);
            if(!valid) return false;
        }

    }
    // if the value is primitive and does not match type. (then true)
    else if (typeof obj !== type && type !== "object" && !Array.isArray(obj)){
        // console.log('this value that is returned is false.');
        return false;
    }


	return true;
}
