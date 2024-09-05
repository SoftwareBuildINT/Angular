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
  lhoList: { LHO_Name: string; lho_id: number; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[] = [];

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    this.fetchLhoList(); // Fetch LHO data on component initialization
  }

  navigateToSiteDetails(lho: { LHO_Name: string; lho_id: number }) {
    if (lho.lho_id !== null) {
      this.router.navigate(['/sidedetails'], { queryParams: { lho_id: lho.lho_id } });
    }
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
      this.http.post('http://localhost:5000/add-lho', { lho_name: this.lhoName })
        .subscribe({
          next: (response: any) => {
            console.log('Response from server:', response);
            alert(response.message || 'LHO saved successfully.');
            this.closeModal(); // Close the modal after saving
            this.fetchLhoList(); // Refresh the LHO list after saving
          },
          error: (error) => {
            console.error('Error saving LHO:', error);
            if (error.status === 409) {
              alert('LHO Name already exists in the database.');
            } else {
              alert('An error occurred while saving the LHO.');
            }
          }
        });
    } else {
      alert('Please enter a valid LHO Name');
    }
  }

  fetchLhoList() {
    this.http.get<{ lho_id: number; lho_name: string; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[]>('http://localhost:5000/lho-list')
      .subscribe({
        next: (response) => {
          console.log('LHO List:', response);
          this.lhoList = response.map(lho => ({
            LHO_Name: lho.lho_name,
            lho_id: lho.lho_id,
            total_locations: lho.total_locations,
            onlineCount: lho.onlineCount,
            offlineCount: lho.offlineCount,
            percentage: parseFloat(lho.percentage.toFixed(2)) // Convert back to a number
          }));
        },
        error: (error) => {
          console.error('Error fetching LHO list:', error);
          alert('An error occurred while fetching the LHO list.');
        }
      });
  }


}
