public class Percolation {
    private final int n;
    private final boolean[][] open;
    private int openSites;
    private final WeightedQuickUnionUF uf;
    //only connect to top to fix backwash
    private final WeightedQuickUnionUF seconduf;
    private final int virtualTop;
    private final int virtualBottom;

    public Percolation(int n){
        if (n <= 0) {
            throw new IllegalArgumentException("grid size must be positive");
        }
        this.n = n;
        this.open= new boolean[n][n];
        this.openSites= 0;
        this.virtualTop = n * n;
        this.virtualBottom = n * n + 1;
        this.uf = new WeightedQuickUnionUF(n * n + 2);
        this.seconduf=new WeightedQuickUnionUF(n*n+1);
    }
//this func will open a blocked square in the grid and connect it to any adjacent squares
    public void open(int row, int col) {
        validate(row, col);
        if (isOpen(row,col)) {
            return;
        }
        open[row][col] = true;
        openSites++;

        int currentIndex = row*n+col;
        //connect to virtualTop
        if(row == 0) {
            uf.union(currentIndex, virtualTop);
            seconduf.union(currentIndex, virtualTop);

        }

        if(row == n-1) {
            uf.union(currentIndex, virtualBottom);
        }
        //connect square to square above
        connectIfOpen(row,col,row - 1, col);
        //connect square to square under
        connectIfOpen(row,col,row + 1, col);
        //left
        connectIfOpen(row,col,row,col - 1);
        //right
        connectIfOpen(row,col,row,col + 1);
    }


    public boolean isOpen(int row, int col){
        validate(row, col);
        return open[row][col];}

    //if its not open then its not full. otherwise connect to virtualTop
    public boolean isFull(int row, int col){
        if (!isOpen(row,col)){
            return false;
        }
       // return uf.connected(row*n+col, virtualTop);
        return seconduf.connected(row * n + col, virtualTop);

    }

    public int numberOfOpenSites(){
        return openSites;
    }

    public boolean percolates() {
        return uf.connected(virtualTop, virtualBottom);
    }



    private void connectIfOpen(int row, int col, int neighborRow, int neighborCol){
        if(neighborRow<0 || neighborRow >= n || neighborCol < 0 || neighborCol >= n){
            return;
        }
        if(isOpen(neighborRow,neighborCol)){
            int currentIndex = row * n + col;
            int neighborIndex = neighborRow * n + neighborCol;
            uf.union(currentIndex,neighborIndex);
            seconduf.union(currentIndex,neighborIndex);
           // uf.union(row*n+col, neighborRow*n+neighborCol);
            //seconduf.union(currentIndex, neighborIndex);

        }
    }

    private void validate(int row, int col) {
        if (row < 0 || row >= n || col < 0 || col >= n) {
            throw new IllegalArgumentException(
                    "row and col must be between 0 and " + (n - 1));
        }
    }


}











//slow percolation
/*public class Percolation {
    private final int n;
    private final boolean[][] open;
    private int openSites;
    private final WeightedQuickUnionUF uf;

    public Percolation(int n) {
        if (n <= 0) {
            throw new IllegalArgumentException("n must be positive");
        }

        this.n = n;
        this.open = new boolean[n][n];
        this.openSites = 0;
        this.uf = new WeightedQuickUnionUF(n * n);
    }

    public void openNaive(int row, int col) {
        validate(row, col);

        if (isOpen(row, col)) {
            return;
        }

        open[row][col] = true;
        openSites++;

        connectIfOpen(row, col, row - 1, col); // up
        connectIfOpen(row, col, row + 1, col); // down
        connectIfOpen(row, col, row, col - 1); // left
        connectIfOpen(row, col, row, col + 1); // right
    }


    public void openFast(int row, int col) {
        openNaive(row, col);
    }

    public boolean isOpen(int row, int col) {
        validate(row, col);
        return open[row][col];
    }
  private void validate(int row, int col) {
        if (row<0 || row >= n || col<0 || col>=n){
            throw new IndexOutOfBoundsException("the row & col has to be between 0 and "+(n-1));
        }
    }
    public boolean isFull(int row, int col) {
        validate(row, col);

        if (!isOpen(row, col)) {
            return false;
        }

        int currentIndex = index(row, col);
        for (int c = 0; c < n; c++) {
            if (isOpen(0, c) && uf.connected(currentIndex, index(0, c))) {
                return true;
            }
        }

        return false;
    }

    public int numberOfOpenSites() {
        return openSites;
    }

    public boolean percolates() {

        for (int topCol = 0; topCol < n; topCol++) {
            if (!isOpen(0, topCol)) {
                continue;
            }

            int topIndex = index(0, topCol);

            for (int bottomCol = 0; bottomCol < n; bottomCol++) {
                if (isOpen(n - 1, bottomCol)
                        && uf.connected(topIndex, index(n - 1, bottomCol))) {
                    return true;
                }
            }
        }

        return false;
    }

    private int index(int row, int col) {
        return row * n + col;
    }

    private void validate(int row, int col) {
        if (row < 0 || row >= n || col < 0 || col >= n) {
            throw new IndexOutOfBoundsException("row and col must be between 0 and " + (n - 1));
        }
    }

    private void connectIfOpen(int row, int col, int neighborRow, int neighborCol) {
        if (neighborRow < 0 || neighborRow >= n || neighborCol < 0 || neighborCol >= n) {
            return;
        }

        if (isOpen(neighborRow, neighborCol)) {
            uf.union(index(row, col), index(neighborRow, neighborCol));
        }
    }


}*/
