const {parse}=require("@babel/parser");const fs=require("fs");
let ok=true;
for(const f of ["components.jsx","App.jsx"]){
  let buf=fs.readFileSync("src/"+f);
  // strip trailing NUL padding
  let end=buf.length; while(end>0 && buf[end-1]===0) end--;
  let code=buf.slice(0,end).toString("utf8");
  try{parse(code,{sourceType:"module",plugins:["jsx"]});console.log("OK:",f,"("+code.split("\n").length+" lines)");}
  catch(e){ok=false;console.log("ERR:",f,"=>",e.message);}
}
process.exit(ok?0:1);
