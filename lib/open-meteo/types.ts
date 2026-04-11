export type OpenMeteoHourlyResponse = {
  time: string[];
  temperature_2m: number[];
  dew_point_2m: number[];
  precipitation: number[];
  cloud_cover: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_speed_925hPa: number[];
  wind_direction_925hPa: number[];
  wind_speed_850hPa: number[];
  wind_direction_850hPa: number[];
  geopotential_height_850hPa: number[];
  cape: number[];
  shortwave_radiation: number[];
};

export type OpenMeteoForecastResponse = {
  hourly: OpenMeteoHourlyResponse;
};
