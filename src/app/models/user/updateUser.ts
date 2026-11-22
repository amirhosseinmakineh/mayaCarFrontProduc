export interface UpdateUser
{
  id : string,
  name : string,
  family : string,
  email? : string,
  mobileNumber : string,
  roleName?: string,
  password : string
}
