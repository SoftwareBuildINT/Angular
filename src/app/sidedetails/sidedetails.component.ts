import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../data.service';
import { HttpClient } from '@angular/common/http';

export interface Site {
  ATM_ID: string;
  unitname: string;
  city: string;
  state: string;
  SiteStatus?: string;
}

@Component({
  selector: 'app-sidedetails',
  templateUrl: './sidedetails.component.html',
  styleUrls: ['./sidedetails.component.scss']
})
export class SidedetailsComponent implements OnInit {
  errorMessage: string | null = null;
  siteList: Site[] = [];
  searchTerm: string = '';
  onlineCount: number = 0;
  offlineCount: number = 0;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  showModal: boolean = false;
  newSite: Site = {
    ATM_ID: '',
    unitname: '',
    city: '',
    state: '',
  };

  lhoId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.lhoId = this.route.snapshot.queryParams['lho_id'];
    this.fetchSiteList();
  }

  fetchSiteList(): void {
    if (this.lhoId) {
      this.dataService.getLhoList(this.lhoId).subscribe(
        (data: any) => {
          console.log('API response:', data);

          if (data && Array.isArray(data)) {
            const lho = data[0];
            this.siteList = lho.atm_data.map(site => ({
              ATM_ID: site.atm_id,
              unitname: site.siteName,
              city: site.city,
              state: site.state,
              SiteStatus: site.status
            }));

            this.onlineCount = lho.onlineCount;
            this.offlineCount = lho.offlineCount;

            console.log('Site list fetched and formatted successfully:', this.siteList);
            console.log('Online count:', this.onlineCount);
            console.log('Offline count:', this.offlineCount);
          } else {
            console.error('Unexpected response format:', data);
          }
        },
        (error) => {
          console.error('Error fetching site list:', error);
        }
      );
    }
  }

  filteredSites(): Site[] {
    if (!this.searchTerm) {
      return this.paginatedSites();
    }
    const lowercasedSearchTerm = this.searchTerm.toLowerCase();
    const filtered = this.siteList.filter(site =>
      site.unitname.toLowerCase().includes(lowercasedSearchTerm) ||
      site.ATM_ID.toLowerCase().includes(lowercasedSearchTerm)
    );
    return this.paginatedSites(filtered);
  }

  paginatedSites(sites: Site[] = this.siteList): Site[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return sites.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.siteList.length) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  navigateToDetails(site: Site): void {
    this.router.navigate(['/liveview'], { queryParams: { atmId: site.ATM_ID } });
  }

  openAddModal(): void {
    this.showModal = true;
  }

  closeAddModal(): void {
    this.showModal = false;
  }

  saveSite(): void {
    const lhoId = this.route.snapshot.queryParams['lho_id']; 
    const atmData = {
      atmId: this.newSite.ATM_ID,
      lho_id: lhoId,
    };

    console.log('New Site Data:', atmData);

    this.dataService.addATM(atmData).subscribe(
      (response) => {
        console.log('ATM added successfully:', response);
        this.fetchSiteList(); 
        this.closeAddModal();
        this.errorMessage = null; // Clear any previous error message
      },
      (error) => {
        if (error.status === 409) {
          console.error('Duplicate ATM ID:', error.error.message);
          this.errorMessage = error.error.message; // Set the error message
        } else {
          console.error('Error adding new ATM:', error);
        }
      }
    );
  }
}
