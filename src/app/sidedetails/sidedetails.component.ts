import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';

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
  siteList: Site[] = [];
  searchTerm: string = '';
  onlineCount: number = 0;
  offlineCount: number = 0;

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;

  // Modal properties
  showModal: boolean = false;
  newSite: Site = {
    ATM_ID: '',
    unitname: '',
    city: '',
    state: '',
  };

  constructor(private router: Router, private dataService: DataService) {}

  ngOnInit(): void {
    this.fetchSiteList();
  }

  fetchSiteList(): void {
    this.dataService.getSiteList().subscribe(
      (data: string) => {
        console.log('Raw API response:', data);

        try {
          const parsedData = JSON.parse(data);

          if (Array.isArray(parsedData)) {
            this.siteList = parsedData.map(site => ({
              ATM_ID: site.ATM_ID,
              unitname: site.unitname,
              city: site.city,
              state: site.state,
              SiteStatus: site.SiteStatus 
            }));

            this.onlineCount = this.siteList.filter(site => site.SiteStatus === 'ONLINE').length;
            this.offlineCount = this.siteList.filter(site => site.SiteStatus === 'OFFLINE').length;

            console.log('Site list fetched and formatted successfully:', this.siteList);
            console.log('Online count:', this.onlineCount);
            console.log('Offline count:', this.offlineCount);
          } else {
            console.error('Unexpected response format:', parsedData);
          }
        } catch (error) {
          console.error('Error parsing JSON response:', error);
        }
      },
      (error) => {
        console.error('Error fetching site list:', error);
      }
    );
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
    // Logic to save the new site
    console.log('New site:', this.newSite);
    this.closeAddModal();
  }
}
