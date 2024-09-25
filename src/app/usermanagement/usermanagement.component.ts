import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-usermanagement',
  templateUrl: './usermanagement.component.html',
  styleUrls: ['./usermanagement.component.scss']
})
export class UsermanagementComponent implements OnInit {
  users: any[] = [];
  userRole: string | null = null; // Track user role

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchUsers();
    this.getUserRole(); // Fetch the user role from local storage
  }

  fetchUsers(): void {
    this.http.get('http://localhost:7558/users').subscribe(
      (data: any) => {
        this.users = data; // Assign the user data to the 'users' variable
      },
      (error) => {
        console.error('Error fetching user data', error);
      }
    );
  }

  getUserRole(): void {
    this.userRole = localStorage.getItem('roleId'); // Fetch the role stored as a string
    if (!this.userRole) {
      console.error('Role ID is not set or not recognized:', this.userRole); // Log for debugging
    }
  }

  deleteUser(userId: string): void {
    console.log(`Delete user with ID: ${userId}`);
    // Implement delete functionality here
  }
}
