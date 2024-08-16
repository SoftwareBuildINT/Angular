import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private loginUrl = 'http://10.30.100.124:3328/login'; // Login API URL
  private siteListUrl = 'https://aapl.birdsi.in/Birds-i_HITACHI_DASHBOARD_API/api/SiteDetailsAll'; // Site list API URL

  constructor(private http: HttpClient) {}

  // Method to log in and store the token
  login(payload: { EmailId: string, password: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(this.loginUrl, payload, { headers }).pipe(
      map(response => {
        // Log the response to the console
        console.log('Login response:', response);

        // Check if the token exists in the response
        if (response.token) {
          // Store the token in local storage
          localStorage.setItem('token', response.token);
          console.log('Token stored:', response.token);
        } else {
          console.warn('Token not found in response');
        }

        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Method to get the site list
 getSiteList(): Observable<any> {
  return this.http.get<any>(this.siteListUrl).pipe(
    catchError(this.handleError)
  );
}

  // Error handling method
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);
    if (error.error) {
      console.error('Error details:', error.error);
    }
    return throwError(
      error.status === 401 ? 'Unauthorized: Invalid credentials or token' : error.message || 'Server error'
    );
  }
}
