export interface Result<T>{
  isSuccess: boolean;
  isFailure: boolean;
  message: string;
  data: T;
}
