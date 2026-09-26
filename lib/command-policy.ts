export const SYLVIA_SAFE_COMMANDS = ["restart","sync","identify","digital_write"] as const;
export type SylviaSafeCommand = typeof SYLVIA_SAFE_COMMANDS[number];
export function validateCommand(command:string,payload:unknown){
  const name=command.trim();
  if(!name||name.length>80||!/^[a-zA-Z0-9_.:-]+$/.test(name))return "Invalid command name";
  const allowCustom=process.env.SYLVIA_ALLOW_CUSTOM_COMMANDS==="true";
  if(!allowCustom&&!SYLVIA_SAFE_COMMANDS.includes(name as SylviaSafeCommand))return "Command is not allowed by the SYLVIA command policy";
  if(name==="digital_write"){
    if(!payload||typeof payload!=="object"||Array.isArray(payload))return "digital_write requires an object payload";
    const candidate=payload as {pin?:unknown;value?:unknown};
    const pin=Number(candidate.pin),value=Number(candidate.value);
    if(!Number.isInteger(pin)||pin<0||pin>16||!Number.isInteger(value)||(value!==0&&value!==1))return "digital_write requires GPIO pin 0-16 and value 0 or 1";
  }
  return null;
}