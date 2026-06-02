import { Routes } from "@angular/router";
import { RegisterComponent } from "./components/register/register.component";
import { LoginComponent } from "./components/login/login.component";
import { AdminDashboardComponent } from "./components/adminDashboard/adminDashboard.component";
import { UserManagementComponent } from "./components/admin/userManagement/userManagement.component";
import { CarManagmentComponent } from './components/admin/carManagment/carManagment.component';
import { HomeComponent } from "./pages/home/home.component";
import { CategoryComponent } from "./components/admin/category/category.component";
import { Company } from './models/company/companyName';
import { CompanyComponent } from "./components/admin/company/company.component";
import { CarModelComponent } from "./components/admin/carModel/carModel.component";
import { TipComponent } from "./components/admin/tip/tip.component";
import { OrderComponent } from "./components/admin/order/order.component";
import { OrderItemComponent } from "./components/admin/orderItem/orderItem.component";
import { CarListComponent } from "./components/carList/carList.component";
import { UserPannelComponent } from "./components/userPannel/userPannel/userPannel.component";
import { InstallmentComponent } from "./components/installment/installment.component";
import path from "path";
import { Component } from "@angular/core";
import { CardetailComponent } from "./components/cardetail/cardetail.component";

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: '', component: HomeComponent },
  {path : 'login',component : LoginComponent},
   {
    path: 'adminDashboard',
    component: AdminDashboardComponent,
    children: [
      { path: 'userManagment', component: UserManagementComponent },
      { path: '', redirectTo: 'userManagment', pathMatch: 'full' },
      {path : 'carManagement',component:CarManagmentComponent},
      {path:'category',component : CategoryComponent},
      {path : 'company',component : CompanyComponent},
      {path : 'model',component:CarModelComponent},
      {path : 'tip', component:TipComponent},
      {path : 'order',component:OrderComponent},
      {path : 'orderItem',component:OrderItemComponent}
    ],
  },
   {path : 'carList',component : CarListComponent},
  { path: '', redirectTo: '/adminDashboard', pathMatch: 'full' },
    {path:'userPannel', component:UserPannelComponent},
    {path:'installment',component:InstallmentComponent},
  { path: 'carDetail/:carId', component: CardetailComponent },

];
