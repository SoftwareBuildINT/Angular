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
  searchTerm: string = '';
  lhoList: { LHO_Name: string; lho_id: number; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[] = [];
  filteredLhoList: { LHO_Name: string; lho_id: number; total_locations: number; onlineCount: number; offlineCount: number; percentage: number; }[] = [];
  userRole: string | null = null;

  // Variables for the card data
  totalLocations: number = 0;
  totalOnline: number = 0;
  totalOffline: number = 0;
  totalPercentage: number = 0;
  
  loading: boolean = true;

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    this.fetchLhoList();
    this.getUserRole();
    this.securanceLogin();
  }

  getUserRole(): void {
    this.userRole = localStorage.getItem('roleId');
    if (!this.userRole) {
      console.error('Role ID is not set or not recognized:', this.userRole);
    }
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
    this.lhoName = '';
  }

  saveLho() {
    if (this.lhoName.trim()) {
      console.log('LHO Name:', this.lhoName);
      this.http.post('https://sbi-dashboard-hitachi.ifiber.in:7558/api/add-lho', { lho_name: this.lhoName })
        .subscribe({
          next: (response: any) => {
            alert(response.message || 'LHO saved successfully.');
            this.closeModal();
            this.fetchLhoList();
          },
          error: (error) => {
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
    this.loading = true;
    this.http.get<{
      totalLocations: number;
      totalOnline: number;
      totalOffline: number;
      totalPercentage: number;
      lhoDetails: {
        lho_id: number;
        lho_name: string;
        total_locations: number;
        atm_ids: string[];
        onlineCount: number;
        offlineCount: number;
        percentage: number;
        atm_data: {
          atm_id: string;
          siteName: string;
          city: string;
          state: string;
          status: string;
        }[];
      }[];
    }>('https://sbi-dashboard-hitachi.ifiber.in:7558/api/lho-list')
      .subscribe({
        next: (response) => {
        
          this.totalLocations = response.totalLocations;
          this.totalOnline = response.totalOnline;
          this.totalOffline = response.totalOffline;
          this.totalPercentage = response.totalPercentage;

          // Process LHO list
          this.lhoList = response.lhoDetails.map(lho => ({
            LHO_Name: lho.lho_name,
            lho_id: lho.lho_id,
            total_locations: lho.total_locations,
            onlineCount: lho.onlineCount,
            offlineCount: lho.offlineCount,
            percentage: lho.percentage
          }));

         
          this.lhoList.sort((a, b) => a.LHO_Name.localeCompare(b.LHO_Name));
          this.filteredLhoList = [...this.lhoList];
          this.loading = false;
        },
        error: () => {
          alert('An error occurred while fetching the LHO list.');
          this.loading = false;
        }
      });
  }

  filterLhoList() {
    this.filteredLhoList = this.lhoList.filter(lho =>
      lho.LHO_Name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  securanceLogin() {
    const data = {
      securance_id: localStorage.getItem('securanceId'),
      email: localStorage.getItem('email'),
      role_id: localStorage.getItem('roleId')
    };
    this.http.post('https://sbi-dashboard-hitachi.ifiber.in:7558/api/securance-login', data)
      .subscribe({
        next: (response: any) => {
          console.log('Securance login successful:', response);
        },
        error: (error) => {
          console.error('Securance login error:', error);
        }
      });
  }
}
