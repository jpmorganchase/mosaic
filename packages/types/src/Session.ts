export type JWT = {
  exp: number;
  UserID?: string;
  JPMCIdentifier?: string;
  UID?: string;
  EmployeeCorporateID?: string;
  CostCenter?: string;
  Country?: string;
  CountryCode?: string;
  Department?: string;
  DisplayName?: string;
  Email?: string;
  EmployeeType?: string;
  FirstName?: string;
  LastName?: string;
  LOB?: string;
  LocationCode?: string;
};

export type Session<TUserProfile> = {
  isLoggedIn: boolean;
  user?: TUserProfile;
};
