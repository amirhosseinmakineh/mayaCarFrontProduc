import { ZeroVehiclesComponent } from './components/admin/zero-vehicles/zero-vehicles.component';
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
import { AboutUsComponent } from "./pages/about-us/about-us.component";
import { ContactUsComponent } from "./pages/contact-us/contact-us.component";
import { TelegramChannelsComponent } from "./components/admin/telegram-channels/telegram-channels.component";

export const routes: Routes = [
  { path: 'admin/dashboard/zero-vehicles', redirectTo: '/adminDashboard/zeroVehicles', pathMatch: 'full' },
  {
    path: 'admin/dashboard/telegram-channels',
    redirectTo: '/adminDashboard/telegramChannels',
    pathMatch: 'full'
  },
  { path: 'register', component: RegisterComponent },
  { path: '', component: HomeComponent },
  { path: 'about-us', component: AboutUsComponent },
  { path: 'contact-us', component: ContactUsComponent },
  {path : 'login',component : LoginComponent},
   {
    path: 'adminDashboard',
    component: AdminDashboardComponent,
    children: [
      { path: 'userManagment', component: UserManagementComponent },
      { path: '', redirectTo: 'userManagment', pathMatch: 'full' },
      {path : 'carManagement',component:CarManagmentComponent, data: { isUsed: false }},
      {path : 'usedCarManagement',component:CarManagmentComponent, data: { isUsed: true }},
      {path:'category',component : CategoryComponent},
      {path : 'company',component : CompanyComponent},
      {path : 'model',component:CarModelComponent},
      {path : 'tip', component:TipComponent},
      {path : 'order',component:OrderComponent},
      {path : 'orderItem',component:OrderItemComponent},
      {path: 'telegramChannels', component: TelegramChannelsComponent},
      {path: 'zeroVehicles', component: ZeroVehiclesComponent}
    ],
  },
   {path : 'carList',component : CarListComponent, data: { isUsed: false }},
  {path : 'usedCarList',component : CarListComponent, data: { isUsed: true }},
  { path: '', redirectTo: '/adminDashboard', pathMatch: 'full' },
    {path:'userPannel', component:UserPannelComponent},
    {path:'installment',component:InstallmentComponent},
  { path: 'carDetail/:carId', component: CardetailComponent },

];
