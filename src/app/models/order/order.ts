import { CreateOrderItem } from "../orderItem/createOrderItem"

export interface Order{
  id : number,
  userName : string,
  carName : string,
  roleName : string,
  createOrderDate  : string
}
export interface CreateOrder{
  userId : string,
  roleId : number,
  carId : number
  userName : string,
  carName : string,
  roleName : string,
  orderItem : CreateOrderItem,
  createOrderDate : string

}

