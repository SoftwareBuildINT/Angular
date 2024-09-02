import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  showModal = false;
  lhoName = '';
  lhoList: { LHO_Name: string; atm_count: number | null }[] = []; // Updated to match API response

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.fetchLhoList(); // Fetch LHO data on component initialization
  }

  navigateToSiteDetails(lho: { LHO_Name: string; atm_count: number | null }) {
    // Navigate to /sidedetails and optionally pass data via query params or state
    this.router.navigate(['/sidedetails'], { queryParams: { lhoName: lho.LHO_Name } });
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  clearInput() {
    this.lhoName = ''; // Clear the input field
  }

  saveLho() {
    if (this.lhoName.trim()) {
      console.log('LHO Name:', this.lhoName);
      this.http.post('http://localhost:5000/LHO', { LHO_Name: this.lhoName })
        .subscribe({
          next: (response: any) => {
            console.log('Response from server:', response);
            alert(response.message || 'LHO saved successfully.');
            this.closeModal(); // Close the modal after saving
            this.fetchLhoList(); // Refresh the LHO list after saving
          },
          error: (error) => {
            console.error('Error saving LHO:', error);
            alert('An error occurred while saving the LHO.');
          }
        });
    } else {
      alert('Please enter a valid LHO Name');
    }
  }

  fetchLhoList() {
    this.http.get<{ count: number; lhoList: { LHO_Name: string; atm_count: number | null }[] }>('http://localhost:5000/LHO')
      .subscribe({
        next: (response) => {
          console.log('LHO List:', response);
          this.lhoList = response.lhoList; // Extract lhoList from the response
        },
        error: (error) => {
          console.error('Error fetching LHO list:', error);
          alert('An error occurred while fetching the LHO list.');
        }
      });
  }
}
