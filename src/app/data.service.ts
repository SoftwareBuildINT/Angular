import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private loginUrl = 'http://localhost:5000/login'; // Login API URL
  private siteListUrl = 'https://aapl.birdsi.in/Birds-i_HITACHI_DASHBOARD_API/api/SiteDetailsAll'; // Site list API URL
  private dashboardUrl = 'http://localhost:5000/dashboard'; // Dashboard API URL

  constructor(private http: HttpClient) { }

  // Method to log in and store the token
  login(payload: { EmailId: string; password: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(this.loginUrl, payload, { headers }).pipe(
      map((response) => {
        console.log('Login response:', response);
        if (response.token) {
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
    const headers = this.getAuthHeaders();

    return this.http.get<any>(this.siteListUrl, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getLhoList(lhoId: string): Observable<any> {
    const apiUrl = `http://localhost:5000/lho-list?lho_id=${lhoId}`;
    return this.http.get(apiUrl, { responseType: 'json' });
  }

  // Method to add a new ATM
  addATM(atmData: { atmId: string; lho_id: string }): Observable<any> {
    const apiUrl = `http://localhost:5000/add-atm`;
    return this.http.post(apiUrl, atmData, { responseType: 'json' });
  }

  // Method to get dashboard data
  getDashboardData(): Observable<any> {
    const headers = this.getAuthHeaders();

    return this.http.get<any>(this.dashboardUrl, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Method to create the authorization header
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Method to check if the user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token; // Return true if token exists, false otherwise
  }

  // Error handling method
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);

    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // The backend returned an unsuccessful response code
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized: Invalid credentials or token';
          break;
        case 404:
          errorMessage = 'Not Found: The requested resource could not be found';
          break;
        case 500:
          errorMessage = 'Server Error: Please try again later';
          break;
        default:
          errorMessage = error.message || 'Server error';
          break;
      }
    }

    console.error('Error details:', errorMessage);
    return throwError(errorMessage);
  }
}
